import type { Request, Response } from "express"
import { supabase } from "../lib/supabaseClient.js"

interface DailyReport{
    parc: string,
    echipa: string[],
    data: string,
    oreLucrate: number,
    inductieOre: number,
    mediuOre: number,
    nearMiss: number,
    mentenantaCorectiva: number,
    mentenantaPreventiva: number

}

function isValidDateString(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const parsed = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
}

function isValidReport(body: any): body is DailyReport {
  if (typeof body?.parc !== 'string' || body.parc.trim().length === 0) return false;

  if (!Array.isArray(body.echipa) || body.echipa.length === 0) return false;
  if (!body.echipa.every((m: unknown) => typeof m === 'string' && m.trim().length > 0)) return false;

  if(!isValidDateString(body.data))
    return false;

  for (const field of ['oreLucrate', 'inductieOre', 'mediuOre', 'nearMiss', 'mentenantaPreventiva', 'mentenantaCorectiva'] as const) {
    const v = body[field];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
  }

  return true;
}

export const uploadReport = async(req: Request, res: Response) => {

    const userId = req.user;
    if(!isValidReport(req.body)){
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii si neaparat valide' });
    }

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss, mentenantaCorectiva, mentenantaPreventiva} = req.body as DailyReport;

    const {error: reportError} = await supabase.from('site_reports').insert({
        'user_id': userId,
        'parc': parc.trim(),
        'echipa': echipa.map((m: string) => m.trim()),
        'data': data,
        'ore_lucrate': oreLucrate,
        'mediu_ore': mediuOre,
        'inductie_ore': inductieOre,
        'near_miss': nearMiss,
        'mentenanta_corectiva': mentenantaCorectiva,
        'mentenanta_preventiva': mentenantaPreventiva
    })

    if(reportError){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, message: 'Raport on-site salvat cu success'});
}

export const getAdminReports = async (req: Request, res: Response) => {

    let query = supabase.from('site_reports').select('*').order('data', {ascending: false});
    const parcFilter = req.query.parc;
    if(parcFilter !== undefined){
        if(typeof parcFilter !== 'string'){
            return res.status(400).json({error: 'Invalid filter'});
        }
        query = query.eq('parc', parcFilter.trim());
    }

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}

export const getReports = async(req: Request, res: Response) => {

    const userId = req.user;

    let query = supabase.from('site_reports').select('*').eq('user_id', userId).order('data', {ascending: false});
    const parcFilter = req.query.parc;
    if(parcFilter !== undefined){
        if(typeof parcFilter !== 'string'){
            return res.status(400).json({error: 'Invalid filter'});
        }
        query = query.eq('parc', parcFilter.trim());
    }

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}

export const editReport = async (req: Request, res: Response) => {

    const userId = req.user;
    const reportId = req.params['id'];
    const {data: reportData, error: reportError} = await supabase.from('site_reports').select('*').eq('id', reportId).eq('user_id', userId).maybeSingle();

    if(reportError){
        return res.status(500).json({error: 'Internal server error'});
    }

    if(!reportData){
        return res.status(400).json({error: 'Raport invalid'});
    }

    if(!isValidReport(req.body)){
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii si neaparat valide' });
    }

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss, mentenantaCorectiva, mentenantaPreventiva} = req.body as DailyReport;


    const{error: updateError} = await supabase.from('site_reports').update({
        'parc': parc.trim(),
        'echipa': echipa.map((m: string) => m.trim()),
        'data': data,
        'ore_lucrate': oreLucrate,
        'mediu_ore': mediuOre,
        'inductie_ore': inductieOre,
        'near_miss': nearMiss,
        'mentenanta_corectiva': mentenantaCorectiva,
        'mentenanta_preventiva': mentenantaPreventiva
    }).eq('id', reportId).eq('user_id', userId);

    if(updateError){
        return res.status(500).json({error: 'Editarea a esuat'});
    }

    return res.status(200).json({success:true, message: 'Raport editat cu success'})

}