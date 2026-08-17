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

export const uploadReport = async(req: Request, res: Response) => {

    const userId = req.user;

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre} = req.body as DailyReport;

    if (!parc || !echipa?.length || !data || oreLucrate == null || inductieOre == null || mediuOre == null) {
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii' });
    }

    const {error: reportError} = await supabase.from('site_reports').insert({
        'user_id': userId,
        'parc': parc,
        'echipa': echipa,
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
    if(parcFilter)
        query = query.eq('parc', (parcFilter as string));

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}