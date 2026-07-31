import type { Request, Response } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { Resend } from "resend";
import { getViewerLinks, downloadSigned } from "../lib/namirial.js";
import { generateZip } from "../lib/utils.js";

const resendKey = process.env.RESEND_API_KEY;
if(!resendKey){
    console.log('[resend error] Missing Resend API key');
    throw new Error('[resend error] Missing Resend API key')
}
const resend = new Resend(resendKey);

export const webhookHandler = async(req: Request, res: Response) => {

    try{
        const envelopeId = req.query.envelope as string | undefined
        const action = req.query.action as string | undefined;

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

    const {data: envelopeStatus, error: envelopeStatusError} = await supabase.from('documents').select('user_status, sef_lucrare_email').eq('namirial_envelope_id', envelopeId).maybeSingle();
    if(envelopeStatusError){
        throw new Error(`DB Error: ${envelopeStatusError.message}`)
    }

    if(!envelopeStatus){
        throw new Error('DB returned no data for the envelope');
    }

    if(envelopeStatus.user_status === 'semnat'){
        await updateFinal(envelopeId, envelopeStatus?.sef_lucrare_email);
        return;
    }  

    const {data: sefLucrareData, error: updateStatusError} = await supabase.from('documents').update({'user_status': 'semnat', 'status': 'semnat_emitent'}).eq('namirial_envelope_id', envelopeId).select('cod_acces').maybeSingle();
    if(updateStatusError){
        throw new Error(`DB Error: ${updateStatusError.message}`)
    }

    if(!sefLucrareData){
        throw new Error('DB returned no data for sef lucrare');
    }

    const sefLucrareLink = (await getViewerLinks(envelopeId))[0]?.link
    if(!sefLucrareLink){
        throw new Error(`Viewer link not found for email: ${envelopeStatus.sef_lucrare_email}`);
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
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">SSM Platform</h1>
                    <p style="color:#94A3B8;margin:4px 0 0;font-size:13px">Permis electric de munca</p>
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
                <p style="margin:0;color:#78350F;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace">${sefLucrareData.cod_acces}</p>
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
      throw new Error(`Resend email failed: ${error.message}`);
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

    const {error: signedUpdateError} = await supabase.from('documents').update(
        {
            'link_semnat': urlData.publicUrl,
            'sef_lucrare_status': 'semnat', 
            'status': 'semnat'
        }
    ).eq('namirial_envelope_id', envelopeId);

    if(signedUpdateError){
        throw new Error("Failed to update link_semnat");
    }

    //send emails with signed documents - to emitent and sef lucrare
    //get zipbytes (zip buffer)
    const zipBuffer = await generateZip(data);

    const { data: emailData, error } = await resend.emails.send(
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
                    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">SSM Platform</h1>
                    <p style="color:#94A3B8;margin:4px 0 0;font-size:13px">Permis electric de munca</p>
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
          filename: `permis_electric_munca_${envelopeId}_${sefLucrareEmail}.zip`
          }]
        }
      )
    if (error) {
      throw new Error(`Resend email failed: ${error.message}`);
    }
}