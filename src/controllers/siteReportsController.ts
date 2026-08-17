import type { Request, Response } from "express"
import { supabase } from "../lib/supabaseClient.js"

interface DailyReport{
    parc: string,
    echipa: string[],
    data: string,
    oreLucrate: number,
    inductieOre: number,
    mediuOre: number
    
}

function isValidReport(body: any): body is DailyReport {
  if (typeof body?.parc !== 'string' || body.parc.trim().length === 0) return false;

  if (!Array.isArray(body.echipa) || body.echipa.length === 0) return false;
  if (!body.echipa.every((m: unknown) => typeof m === 'string' && m.trim().length > 0)) return false;

  if (typeof body.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) return false;
  if (isNaN(Date.parse(body.data))) return false;

  for (const field of ['oreLucrate', 'inductieOre', 'mediuOre'] as const) {
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

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre} = req.body as DailyReport;

    if (!parc || !echipa?.length || !data || oreLucrate == null || inductieOre == null || mediuOre == null) {
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii' });
    }

    const {error: reportError} = await supabase.from('site_reports').insert({
        'user_id': userId,
        'parc': parc,
        'echipa': echipa.map((m: string) => m.trim()),
        'data': data,
        'ore_lucrate': oreLucrate,
        'mediu_ore': mediuOre,
        'inductie_ore': inductieOre
    })

    if(reportError){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, message: 'Raport on-site salvat cu success'});
}

export const getReports = async (req: Request, res: Response) => {

    let query = supabase.from('site_reports').select('*').order('data', {ascending: false});
    const parcFilter = req.query.parc;
    if(parcFilter !== undefined){
        if(typeof parcFilter !== 'string'){
            return res.status(400).json({error: 'Invalid filter'});
        }
        query = query.eq('parc', parcFilter);
    }

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}