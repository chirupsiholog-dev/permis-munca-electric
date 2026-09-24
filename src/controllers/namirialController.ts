import type { Request, Response } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { Resend } from "resend";
import { getViewerLinks, downloadSigned, getEnvelopeStatus } from "../lib/namirial.js";
import { generateZip } from "../lib/utils.js";

const resendKey = process.env.RESEND_API_KEY;
if(!resendKey){
    console.log('[resend error] Missing Resend API key');
    throw new Error('[resend error] Missing Resend API key')
}
const resend = new Resend(resendKey);

const webhookSecret = process.env.WEBHOOK_SECRET;
if(!webhookSecret){
  console.log('[namirial webhook] Missing webhook secret');
  throw new Error('[namirial webhook] Missing webhook secret')
}

export const webhookHandler = async(req: Request, res: Response) => {

    try{
        const envelopeId = req.query.envelope as string | undefined
        const action = req.query.action as string | undefined;

        const secret = req.params.secret as string | undefined

        if(!secret){
          return res.status(403).json({error: 'Authenticate and retry'});
        }

        if(secret !== webhookSecret){
          return res.status(403).json({error: 'Authenticate and retry'});
        }
        

        if(!envelopeId){
            return res.status(400).json({ error: 'Missing envelope ID' })
        }

        if(action?.toLowerCase() === 'workstepfinished')
          await syncEnvelopeActivities(envelopeId);

        return res.status(200).json({success: true});
    }catch(err){
        console.error('Webhook Error:', err);
        return res.status(500).send('Internal Server Error');
    }
    
}

async function syncEnvelopeActivities(envelopeId: string){

    const {data: envelopeStatus, error: envelopeStatusError} = await supabase.from('documents').select('*').eq('namirial_envelope_id', envelopeId).maybeSingle();
    if(envelopeStatusError){
        throw new Error(`DB Error: ${envelopeStatusError.message}`)
    }

    if(!envelopeStatus){
        throw new Error('DB returned no data for the envelope');
    }

    //second callback case - go to updateFinal if:
    //worflow_status is pending_sef_lucrare - there were no tries to send an email to sef lucrare yet
    //worfklow_status is processing_final_zip - there was a failed try to send the email to sef lucrare, and the webhook is retrying
    if(envelopeStatus.workflow_status === 'pending_sef_lucrare' || envelopeStatus.workflow_status === 'processing_final_zip'){
        if(!envelopeStatus.sef_lucrare_email){
            throw new Error(`Missing sef_lucrare_email for envelope ${envelopeId}`);
        }
        //if we are not in a retry
        if(envelopeStatus.workflow_status === 'pending_sef_lucrare'){
          //try to update workflow_status to processing_final_zip
          //if 2 requests hit simulatenously, only 1 will succeed, and that request is the only 1 how goes to updateFinal
          const{data: claimData, error: claimError} = await supabase.from('documents')
            .update({'workflow_status': 'processing_final_zip'})
            .eq('namirial_envelope_id', envelopeId)
            .eq('workflow_status', 'pending_sef_lucrare') //conditional lock - if 2 requests hit at the same time, 1 will manage the update and will update 1 row, and the other 1 will already see workflow_status = processing_final_zip and will update 0 rows
            .select('*').maybeSingle() //we use the select to see how many rows the update affected - if the update returns no data (!claimData), it means the select returns nothing because no rows were affected by the update

          if (claimError) throw new Error(`Claim Error: ${claimError.message}`);
          //if the update affected 0 rows, the update was already take care of by another request
          if(!claimData){
            console.log(`[syncEnvelopeActivities] Envelope ${envelopeId} already finalizing or finalized.`); //0 rows updated case - envelope was already taken care of by another request
            return;
          }
        }
       
        //if the request won the lock (updated workflow_status to processing_final_zip)
        //or we are in the retry case
        //we proceed with updateFinal
        await updateFinal(envelopeId, envelopeStatus.sef_lucrare_email);
        return;
    }  

    //first callback case - send signing link to sef lucrare and update user_status to semnat
    //if 2 requests hit at the same time, sef lucrare will receive 2 emails
    //pending_emitent => first try
    //processing invite => webhook_retry
    if(envelopeStatus.workflow_status === 'pending_emitent' || envelopeStatus.workflow_status === 'processing_invite'){

      //first try
      if(envelopeStatus.workflow_status === 'pending_emitent'){
        const {data: claimData, error: claimError} = await supabase.from('documents')
          .update({'workflow_status': 'processing_invite'})
          .eq('namirial_envelope_id', envelopeId)
          .eq('workflow_status', 'pending_emitent').select('*').maybeSingle();

        if (claimError) throw new Error(`Claim Error: ${claimError.message}`);

        if(!claimData){
          console.log(`[syncEnvelopeActivities] Envelope ${envelopeId} already processing invite.`);
          return;
        }
      }


      //try to send the email first
      const sefLucrareLink = (await getViewerLinks(envelopeId))[0]?.link
      if(!sefLucrareLink){
          throw new Error(`Viewer link not found for envelope: ${envelopeId}`);
      }

      const { data, error } = await resend.emails.send(
      {
      from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
      to: [envelopeStatus.sef_lucrare_email],
      subject: 'Semnatura permis electric de munca',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
            
            <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                  </td>
                </tr>
              </table>
            </div>

            <div style="padding:32px 30px">
              <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${envelopeStatus.sef_lucrare_email}</strong>!</p>

              <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
                <p style="color:#047857;margin:0;font-size:14px">
                  ✓ Permisul electric de munca a fost semnat de catre emitent.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
                Pentru a finaliza procesul, va rugam sa semnati documentele in calitate de <strong>sef de lucrare</strong>, accesand link-ul de mai jos.
              </p>

              <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 18px;margin-bottom:28px">
                <p style="margin:0 0 6px;color:#92400E;font-size:13px;font-weight:600">CODUL DUMNEAVOASTRA DE IDENTIFICARE</p>
                <p style="margin:0;color:#78350F;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${envelopeStatus.cod_acces}</p>
                <p style="margin:8px 0 0;color:#92400E;font-size:12px">Vi se va solicita acest cod la pasul de semnare.</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${sefLucrareLink}" style="background:#1E293B;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                      Semneaza Permisul →
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
              <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
            </div>
          </div>
        </div>
      `
        }
      )
      if (error) {
        //if the email fails, we throw here and the workflow_status remains processing_invite - webhook retry convention
        throw new Error(`Resend email failed: ${error.message}`);
      }

      //only update after the email was sent, to also allow webhook retries for this email
      const {error: updateStatusError} = await supabase.from('documents').
      update({'workflow_status': 'pending_sef_lucrare', 'emitent_signed_at': new Date().toISOString(), 'sef_lucrare_signing_link': sefLucrareLink}).
      eq('namirial_envelope_id', envelopeId)
      .eq('workflow_status', 'processing_invite')

      if(updateStatusError){
          throw new Error(`DB Error: ${updateStatusError.message}`)
      }

    }
}

async function updateFinal(envelopeId: string, sefLucrareEmail: string){

    const data = await downloadSigned(envelopeId);

    if(!data.documents || data.documents.length === 0) {
        throw new Error('Could not download documents');
    }

    const firstDoc = data.documents?.[0];
    if (!firstDoc) {
        throw new Error('Could not download documents or document array is empty');
    }

    const pdfBase64 = firstDoc.base64;
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const docName = firstDoc.fileName;

    const storagePath = `signedDocs/signed_${docName}`;
    const {error: uploadError} = await supabase.storage.from('Documents')
                    .upload(storagePath, pdfBuffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    })
    if(uploadError) {
        throw new Error(`Upload Error: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
    .from('Documents')
    .getPublicUrl(storagePath);

    if(!urlData || !urlData.publicUrl){
        throw new Error('Failed to fetch signed doc storage URL');
    }

    //send emails with signed documents
    //get zipbytes (zip buffer)
    const zipBuffer = await generateZip(data);

    const { error } = await resend.emails.send(
        {
      from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
      to: [sefLucrareEmail],
      subject: 'Semnatura permis electric de munca',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
            
            <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                  </td>
                </tr>
              </table>
            </div>

            <div style="padding:32px 30px">
              <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${sefLucrareEmail}</strong>!</p>

              <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
                <p style="color:#047857;margin:0;font-size:14px">
                  ✓ Semnarea permisului electric de munca a fost finalizata
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
                Pentru a finaliza procesul, puteti descarca permisul atasat.
              </p>

            <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
              <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
          content: zipBuffer,
          filename: `permis_electric_munca_${envelopeId}.zip`
          }]
        }
      )
    if (error) {
      throw new Error(`Resend email failed: ${error.message}`);
    }

    //only update the db if the email was successfuly sent
    //if the server crashes, namirial might retry the webhook
    //but if we update the db first, it will change workflow_status to completed before sending the email
    //in syncEnvelopeActivities, the retry convention is to retry when workflow_status is processing_final_zip, so we keep it that way until the email is finally sent
    const {error: signedUpdateError} = await supabase.from('documents').update(
        {
            'sef_lucrare_signed_at': new Date().toISOString(),
            'link_semnat': urlData.publicUrl,
            'workflow_status': 'completed', 
        }
    ).eq('namirial_envelope_id', envelopeId);

    if(signedUpdateError){
        throw new Error("Failed to update link_semnat");
    }
}

interface EnvelopeStatus{

  id: string,
  user_id: string,
  storage_path: string,
  email_admitent: string,
  email_sef_lucrare: string,
  namirial_envelope_id: string,
  emitent_signing_link: string,
  workflow_status: string,
  cod_acces: string

}

function findViewerLinkForEmail(
  viewerLinks: Awaited<ReturnType<typeof getViewerLinks>>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  return viewerLinks.find((viewerLink) => viewerLink.email.trim().toLowerCase() === normalizedEmail);
}

async function sefLucrareCallback(envelopeId: string, envelopeStatus: EnvelopeStatus){
    //first callback case - send signing link to sef lucrare and update user_status to semnat
    //if 2 requests hit at the same time, sef lucrare will receive 2 emails
    //pending_emitent => first try
    //processing invite => webhook_retry

    if(envelopeStatus.workflow_status === 'pending_emitent' || envelopeStatus.workflow_status === 'processing_invite'){

      const active = findViewerLinkForEmail(
        await getViewerLinks(envelopeId),
        envelopeStatus.email_sef_lucrare,
      );
      if (!active) {
          console.info('[autorizatii webhook] Signing link is not available yet', {
            envelopeId,
            recipient: envelopeStatus.email_sef_lucrare,
          });
          return;
      }
      if (active.email.trim().toLowerCase() !== envelopeStatus.email_sef_lucrare.trim().toLowerCase()) {
          console.info('[autorizatii webhook] Skipping invitation: sef lucrare is not active', { envelopeId, workflowStatus: envelopeStatus.workflow_status });
          return; //sef lucrare is not active yet; don't advance.
      }
      //first try
      if(envelopeStatus.workflow_status === 'pending_emitent'){
        const {data: claimData, error: claimError} = await supabase.from('autorizatii')
          .update({'workflow_status': 'processing_invite'})
          .eq('namirial_envelope_id', envelopeId)
          .eq('workflow_status', 'pending_emitent').select('*').maybeSingle();

        if (claimError) throw new Error(`Claim Error: ${claimError.message}`);

        if(!claimData){
          console.log(`[syncEnvelopeActivities] Envelope ${envelopeId} already processing invite.`);
          return;
        }
      }


      //try to send the email first

      const { data, error } = await resend.emails.send(
      {
      from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
      to: [envelopeStatus.email_sef_lucrare],
      subject: 'Semnatura autorizatie de lucru',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
            
            <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                  </td>
                </tr>
              </table>
            </div>

            <div style="padding:32px 30px">
              <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${envelopeStatus.email_sef_lucrare}</strong>!</p>

              <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
                <p style="color:#047857;margin:0;font-size:14px">
                  ✓ Permisul electric de munca a fost semnat de catre emitent.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
                Pentru a finaliza procesul, va rugam sa semnati documentele in calitate de <strong>sef de lucrare</strong>, accesand link-ul de mai jos.
              </p>

              <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 18px;margin-bottom:28px">
                <p style="margin:0 0 6px;color:#92400E;font-size:13px;font-weight:600">CODUL DUMNEAVOASTRA DE IDENTIFICARE</p>
                <p style="margin:0;color:#78350F;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${envelopeStatus.cod_acces}</p>
                <p style="margin:8px 0 0;color:#92400E;font-size:12px">Vi se va solicita acest cod la pasul de semnare.</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${active.link}" style="background:#1E293B;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                      Semneaza Autorizatia →
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
              <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
            </div>
          </div>
        </div>
      `
        }
      )
      if (error) {
        //if the email fails, we throw here and the workflow_status remains processing_invite - webhook retry convention
        throw new Error(`Resend email failed: ${error.message}`);
      }

      //only update after the email was sent, to also allow webhook retries for this email
      const {error: updateStatusError} = await supabase.from('autorizatii').
      update({'workflow_status': 'pending_sef_lucrare', 'sef_lucrare_signing_link': active.link}).
      eq('namirial_envelope_id', envelopeId)
      .eq('workflow_status', 'processing_invite')

      if(updateStatusError){
          throw new Error(`DB Error: ${updateStatusError.message}`)
      }
    }

}

async function admitentCallback(envelopeId: string, envelopeStatus: EnvelopeStatus){

    //second callback case - go to admitent if:
    //worflow_status is pending_sef_lucrare - there were no tries to send an email to sef lucrare yet
    //worfklow_status is processing_final_zip - there was a failed try to send the email to sef lucrare, and the webhook is retrying
    if(envelopeStatus.workflow_status === 'pending_sef_lucrare'){

      if(!envelopeStatus.email_admitent){
          throw new Error(`Missing email_admitent for envelope ${envelopeId}`);
      }

      const active = findViewerLinkForEmail(
        await getViewerLinks(envelopeId),
        envelopeStatus.email_admitent,
      );
      if (!active) {
          console.info('[autorizatii webhook] Signing link is not available yet', {
            envelopeId,
            recipient: envelopeStatus.email_admitent,
          });
          return;
      }
      if (active.email.trim().toLowerCase() !== envelopeStatus.email_admitent.trim().toLowerCase()) {
          console.info('[autorizatii webhook] Skipping invitation: admitent is not active', { envelopeId, workflowStatus: envelopeStatus.workflow_status });
          return; //admitent is not active yet; don't advance.
      }

      //if we are not in a retry
      if(envelopeStatus.workflow_status === 'pending_sef_lucrare'){
          //try to update workflow_status to processing_final_zip
          //if 2 requests hit simulatenously, only 1 will succeed, and that request is the only 1 how goes to updateFinal
          const{data: claimData, error: claimError} = await supabase.from('autorizatii')
            .update({'workflow_status': 'processing_admitent_invite'})
            .eq('namirial_envelope_id', envelopeId)
            .eq('workflow_status', 'pending_sef_lucrare') //conditional lock - if 2 requests hit at the same time, 1 will manage the update and will update 1 row, and the other 1 will already see workflow_status = processing_admitent_invite and will update 0 rows
            .select('*').maybeSingle() //we use the select to see how many rows the update affected - if the update returns no data (!claimData), it means the select returns nothing because no rows were affected by the update

        if (claimError) throw new Error(`Claim Error: ${claimError.message}`);
        //if the update affected 0 rows, the update was already take care of by another request
        if(!claimData){
          console.log(`[syncEnvelopeActivities] Envelope ${envelopeId} already finalizing or finalized.`); //0 rows updated case - envelope was already taken care of by another request
          return;
        }
      }

      const { data, error } = await resend.emails.send(
      {
      from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
      to: [envelopeStatus.email_admitent],
      subject: 'Semnatura autorizatie de lucru',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
            
            <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                  </td>
                </tr>
              </table>
            </div>

            <div style="padding:32px 30px">
              <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${envelopeStatus.email_admitent}</strong>!</p>

              <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
                <p style="color:#047857;margin:0;font-size:14px">
                  ✓ Permisul electric de munca a fost semnat de catre emitent.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
                Pentru a finaliza procesul, va rugam sa semnati documentele in calitate de <strong>admitent</strong>, accesand link-ul de mai jos.
              </p>

              <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 18px;margin-bottom:28px">
                <p style="margin:0 0 6px;color:#92400E;font-size:13px;font-weight:600">CODUL DUMNEAVOASTRA DE IDENTIFICARE</p>
                <p style="margin:0;color:#78350F;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${envelopeStatus.cod_acces}</p>
                <p style="margin:8px 0 0;color:#92400E;font-size:12px">Vi se va solicita acest cod la pasul de semnare.</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${active.link}" style="background:#1E293B;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                      Semneaza Autorizatia →
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
              <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
            </div>
          </div>
        </div>
      `
        }
      )
      if (error) {
        //if the email fails, we throw here and the workflow_status remains processing_admitent_invite - webhook retry convention
        throw new Error(`Resend email failed: ${error.message}`);
      }
       
      //only update after the email was sent, to also allow webhook retries for this email
      const {error: updateStatusError} = await supabase.from('autorizatii').
      update({'workflow_status': 'pending_admitent', 'admitent_signing_link': active.link}).
      eq('namirial_envelope_id', envelopeId).eq('workflow_status', 'processing_admitent_invite')

      if (updateStatusError) {
        throw new Error(`DB Error: ${updateStatusError.message}`);
      }
  }
}

async function sendExecutantEmail(emailExecutant: string, codAcces: string, viewerLink: string){
  const { data, error } = await resend.emails.send(
    {
    from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
    to: [emailExecutant],
    subject: 'Semnatura autorizatie de lucru',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          
          <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding:32px 30px">
            <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${emailExecutant}</strong>!</p>

            <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
              <p style="color:#047857;margin:0;font-size:14px">
                ✓ Permisul electric de munca a fost semnat de catre emitent.
              </p>
            </div>

            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
              Pentru a finaliza procesul, va rugam sa semnati documentele in calitate de <strong>admitent</strong>, accesand link-ul de mai jos.
            </p>

            <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 18px;margin-bottom:28px">
              <p style="margin:0 0 6px;color:#92400E;font-size:13px;font-weight:600">CODUL DUMNEAVOASTRA DE IDENTIFICARE</p>
              <p style="margin:0;color:#78350F;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${codAcces}</p>
              <p style="margin:8px 0 0;color:#92400E;font-size:12px">Vi se va solicita acest cod la pasul de semnare.</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${viewerLink}" style="background:#1E293B;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                    Semneaza Autorizatia →
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
            <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
          </div>
        </div>
      </div>
    `
      }
    )
    if (error) {
      //The status claim prevents duplicate emails when Namirial sends multiple callbacks.
      throw new Error(`Resend email failed: ${error.message}`);
    }
}

async function executantiModificatiCallback(envelopeId: string, envelopeStatus: EnvelopeStatus){

  if(envelopeStatus.workflow_status === 'pending_admitent' ||
     envelopeStatus.workflow_status === 'processing_executanti_invite' ||
     envelopeStatus.workflow_status === 'pending_executanti'){

    if(envelopeStatus.workflow_status === 'pending_admitent'){
      const knownEarlierSigners = new Set([
        envelopeStatus.email_sef_lucrare.trim().toLowerCase(),
        envelopeStatus.email_admitent.trim().toLowerCase(),
      ]);
      const viewerLinks = (await getViewerLinks(envelopeId)).filter(
        (viewerLink) => !knownEarlierSigners.has(viewerLink.email.trim().toLowerCase()),
      );
      if (viewerLinks.length === 0) {
        console.info('[autorizatii webhook] Executant links are not available yet', { envelopeId });
        return;
      }

      const {data: claimData, error: claimError} = await supabase.from('autorizatii')
        .update({'workflow_status': 'processing_executanti_invite'})
        .eq('namirial_envelope_id', envelopeId)
        .eq('workflow_status', 'pending_admitent').select('*').maybeSingle();

      if (claimError) throw new Error(`Claim Error: ${claimError.message}`);

      if(!claimData){
        console.log(`[syncEnvelopeActivities] Envelope ${envelopeId} already processing invite.`);
        return;
      }

      await Promise.all(viewerLinks.map(v => sendExecutantEmail(v.email, envelopeStatus.cod_acces, v.link)));

      //update after emails were sent
      const {error: updateStatusError} = await supabase.from('autorizatii').
      update({'workflow_status': 'pending_executanti', 'executanti_signing_links': viewerLinks.map(v => v.link)}).
      eq('namirial_envelope_id', envelopeId).eq('workflow_status', 'processing_executanti_invite')

      if (updateStatusError) {
        throw new Error(`DB Error: ${updateStatusError.message}`);
      }
    
    }

    const {activities} = await getEnvelopeStatus(envelopeId)
    const allExecutantiSigned = activities.length > 0 && activities.every(a => a.status.toLowerCase() === 'completed')

    if(!allExecutantiSigned)
      return;

    //if all executanti signed
    const {error: updateStatusError} = await supabase.from('autorizatii').
    update({'workflow_status': 'semnat'}).
    eq('namirial_envelope_id', envelopeId).eq('workflow_status', 'pending_executanti')

    if (updateStatusError) {
      throw new Error(`DB Error: ${updateStatusError.message}`);
    }

    //get fully signed doc
    const data = await downloadSigned(envelopeId)
    
    if(!data.documents || data.documents.length === 0) {
        throw new Error('Could not download documents');
    }

    const firstDoc = data.documents?.[0];
    if (!firstDoc) {
        throw new Error('Could not download documents or document array is empty');
    }

    const pdfBase64 = firstDoc.base64
    const fileName = firstDoc.fileName
    const pdfBytes = Buffer.from(pdfBase64, 'base64')
    //upload to storage
    const storagePath = `signedAutorizatii/signed_${fileName}`;
    const {error: uploadError} = await supabase.storage.from('Documents')
                    .upload(storagePath, pdfBytes, {
                        contentType: 'application/pdf',
                        upsert: true
                    })
    if(uploadError) {
        throw new Error(`Upload Error: ${uploadError.message}`);
    }

    //upload storagePath to autorizatii table
    const {error: updateSignedStoragePathError} = await supabase.from('autorizatii').
    update({'signed_storage_path': storagePath}).
    eq('namirial_envelope_id', envelopeId)

    if (updateSignedStoragePathError) {
      throw new Error(`DB Error: ${updateSignedStoragePathError.message}`);
    }

  }
  
}

async function syncEnvelopeActivitiesAutorizatii(envelopeId: string){

    const {data: envelopeStatus, error: envelopeStatusError} = await supabase.from('autorizatii').select('*').eq('namirial_envelope_id', envelopeId).maybeSingle();
    if(envelopeStatusError){
        throw new Error(`DB Error: ${envelopeStatusError.message}`)
    }

    if(!envelopeStatus){
        throw new Error('DB returned no data for the envelope');
    }

    console.info('[autorizatii webhook] Processing envelope', { envelopeId, workflowStatus: envelopeStatus.workflow_status });
    await sefLucrareCallback(envelopeId, envelopeStatus)

    const {data: afterSefStatus, error: afterSefStatusError} = await supabase.from('autorizatii').select('*').eq('namirial_envelope_id', envelopeId).maybeSingle();
    if (afterSefStatusError || !afterSefStatus) {
      throw new Error(`DB Error: ${afterSefStatusError?.message ?? 'Authorization not found after sef lucrare callback'}`);
    }

    await admitentCallback(envelopeId, afterSefStatus)

    const {data: afterAdmitentStatus, error: afterAdmitentStatusError} = await supabase.from('autorizatii')
      .select('*').eq('namirial_envelope_id', envelopeId).maybeSingle();
    if (afterAdmitentStatusError || !afterAdmitentStatus) {
      throw new Error(`DB Error: ${afterAdmitentStatusError?.message ?? 'Authorization not found after admitent callback'}`);
    }

    await executantiModificatiCallback(envelopeId, afterAdmitentStatus)
}

export const webhookHandlerAutorizatii = async(req: Request, res: Response) => {

    try{
        const envelopeId = req.query.envelope as string | undefined
        const action = req.query.action as string | undefined;

        const secret = req.params.secret as string | undefined

        if(!secret){
          console.warn('[autorizatii webhook] Rejected: missing secret');
          return res.status(403).json({error: 'Authenticate and retry'});
        }

        if(secret !== webhookSecret){
          console.warn('[autorizatii webhook] Rejected: secret mismatch');
          return res.status(403).json({error: 'Authenticate and retry'});
        }
        

        if(!envelopeId){
            return res.status(400).json({ error: 'Missing envelope ID' })
        }

        console.info('[autorizatii webhook] Received callback', { envelopeId, action });
        const actionableEvents = new Set(['workstepfinished', 'workstepopened', 'sendsignnotification']);
        // CallbackUrl does not include an action; treat it as a valid retry/finalization signal.
        if(!action || actionableEvents.has(action.toLowerCase()))
          await syncEnvelopeActivitiesAutorizatii(envelopeId);
        else
          console.info('[autorizatii webhook] Ignored action', { envelopeId, action });

        return res.status(200).json({success: true});
    }catch(err){
        console.error('Webhook Error:', err);
        return res.status(500).send('Internal Server Error');
    }
    
}
