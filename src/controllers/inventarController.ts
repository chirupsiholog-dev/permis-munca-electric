import type { Request, Response } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { fillInventarPdf, type InventarData } from "../lib/utils.js";
import path from "path";

interface Inventar{

    praf: boolean,
    ventilatoare: boolean,
    inventorDeteriorat: boolean,
    inventorSunete: boolean,
    parametriiCorecti: boolean,
    cabluriConectate: boolean,
    cabluriIntacte: boolean,
    capaceEtansare: boolean,
    porturi: boolean,
    impamantare: boolean,
    comutatorCurent: boolean,
    suruburi: boolean
    remarks: string;
    data: string,
    inverter: string,
    turnon: string,
    turnoff: string
}

function isValidInventar(body: any): body is Inventar{

    for(const field of ['praf', 'ventilatoare', 'inventorDeteriorat', 'inventorSunete', 'parametriiCorecti', 
        'cabluriConectate', 'cabluriIntacte', 'capaceEtansare', 'porturi', 'impamantare', 'comutatorCurent', 'suruburi']){

            const v = body[field];
            if(typeof v !== 'boolean')
                return false;
        }
    
    if(typeof body['remarks'] !== 'string' || typeof body['data'] !== 'string' || typeof body['inverter'] !== 'string' || typeof body['turnoff'] !== 'string' || typeof body['turnon'] !== 'string')
        return false;

    if(body['data'].trim() === '' || body['inverter'].trim() === '' || body['turnon'].trim() === '' || body['turnoff'].trim() === '')
        return false;

    return true;
}

export const uploadInventar = async (req: Request, res: Response) => {


    const userId = req.user;
    if (!userId) return res.status(401).json({error: 'Unauthorized'})
    if(!isValidInventar(req.body))
        return res.status(400).json({error: 'Inventarul nu este complet'})

    const {praf,
    ventilatoare,
    inventorDeteriorat ,
    inventorSunete,
    parametriiCorecti,
    cabluriConectate,
    cabluriIntacte,
    capaceEtansare,
    porturi,
    impamantare,
    comutatorCurent,
    suruburi,
    remarks, inverter, data, turnon, turnoff} = req.body

    const {error: inventarError} = await supabase.from('inventare').insert({
        'user_id': userId,
        'praf': praf,
        'ventilatoare': ventilatoare,
        'inventor_deteriorat': inventorDeteriorat,
        'inventor_sunete': inventorSunete,
        'parametrii_corecti': parametriiCorecti,
        'cabluri_conectate': cabluriConectate,
        'cabluri_intacte': cabluriIntacte,
        'capace_etansare': capaceEtansare,
        'porturi': porturi,
        'impamantare': impamantare,
        'comutator_curent': comutatorCurent,
        'suruburi': suruburi,
        'remarks': remarks.trim(),
        'inverter': inverter.trim(),
        'data': data,
        'turn_on': turnon.trim(),
        'turn_off': turnoff.trim()
    })

    if(inventarError)
        return res.status(500).json({error: 'Internal server error'});

    return res.status(200).json({success: true, message: 'Inventar salvat cu succes'})

}

export const getMyInventare = async(req: Request, res: Response)=>{

    const user_id = req.user;
    let query = supabase.from('inventare').select('*').eq('user_id', user_id).order('data', {ascending: false})
    //get inverter filter if any
    const inverterFilter = req.query.inverter;
    //if there is a filter
    if(inverterFilter !== undefined){
        if(typeof inverterFilter !== 'string')
            return res.status(400).json({error: 'Filtru invalid'});
        //add it to the query
        query = query.eq('inverter', inverterFilter.trim());
    }
    //query with or without filter
    const{data, error} = await query
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}

export const editInventar = async(req: Request, res: Response) => {

    const userId = req.user;
    if (!userId) return res.status(401).json({error: 'Unauthorized'});

    const inventarId = req.params['id'];
    const {data: inventarData, error: inventarCheckError} = await supabase.from('inventare').select('*').eq('id', inventarId).eq('user_id', userId).maybeSingle();
    
    if(inventarCheckError){
        return res.status(500).json({error: 'Internal server error'});
    }

    if(!inventarData){
        return res.status(404).json({error: 'Inventar invalid'});
    }

    if(!isValidInventar(req.body)){
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii si neaparat valide' });
    }

    const {praf,
    ventilatoare,
    inventorDeteriorat ,
    inventorSunete,
    parametriiCorecti,
    cabluriConectate,
    cabluriIntacte,
    capaceEtansare,
    porturi,
    impamantare,
    comutatorCurent,
    suruburi,
    remarks, inverter, data, turnon, turnoff} = req.body

    const {error: inventarUpdateError} = await supabase.from('inventare').update({
        'praf': praf,
        'ventilatoare': ventilatoare,
        'inventor_deteriorat': inventorDeteriorat,
        'inventor_sunete': inventorSunete,
        'parametrii_corecti': parametriiCorecti,
        'cabluri_conectate': cabluriConectate,
        'cabluri_intacte': cabluriIntacte,
        'capace_etansare': capaceEtansare,
        'porturi': porturi,
        'impamantare': impamantare,
        'comutator_curent': comutatorCurent,
        'suruburi': suruburi,
        'remarks': remarks.trim(),
        'inverter': inverter.trim(),
        'data': data,
        'turn_on': turnon.trim(),
        'turn_off': turnoff.trim()
    }).eq('id', inventarId).eq('user_id', userId)

    if(inventarUpdateError)
        return res.status(500).json({error: 'Internal server error'});

    return res.status(200).json({success: true, message: 'Inventar editat cu succes'})

}

export const deleteInventar = async(req: Request, res: Response)=>{

    const userId = req.user;

    const inventarId = req.params['id'];
    const {data: checkInventarData, error: checkInventarError} = await supabase.from('inventare').select('*').eq('id', inventarId).eq('user_id', userId).maybeSingle();
    if(checkInventarError){
        return res.status(500).json({error: 'Internal server error'});
    }

    if(!checkInventarData){
        return res.status(404).json({error: 'Inventar invalid'});
    }

    const {error: deleteInventarError} = await supabase.from('inventare').delete().eq('user_id', userId).eq('id', inventarId);
    if(deleteInventarError)
        return res.status(500).json({error: 'Internal server error'});

    return res.status(200).json({success: true, message: 'Inventar sters cu success'})

}

export const getSubordinatesInventare
 = async(req: Request, res: Response) => {

    const user_id = req.user;
    //get subordianates;
    const {data: subordinates, error: subordinatesError} = await supabase.from('users').select('id').eq('created_by', user_id);
    if(subordinatesError){
        return res.status(500).json({error: 'Internal server error'});
    }
    const subordinatesIds = subordinates.map(s => s.id);
    //get their inventare

    let query = supabase.from('inventare').select('*').in('user_id', subordinatesIds);
    let inverterFilter = req.query.inverter;
    if(inverterFilter !== undefined){
        if(typeof inverterFilter !== 'string')
            return res.status(400).json({error: 'Filtru invalid'});
        //add it to the query
        query = query.eq('inverter', inverterFilter.trim());
    }

    const {data: subordinatesInventare, error: subordinatesInventareError} = await query
    if(subordinatesInventareError){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: subordinatesInventare})

}

export const getAllInventare = async(req: Request, res: Response) => {

    const user_id = req.user;

    let query = supabase.from('inventare').select('*');
    let inverterFilter = req.query.inverter;
    if(inverterFilter !== undefined){
        if(typeof inverterFilter !== 'string')
            return res.status(400).json({error: 'Filtru invalid'});
        //add it to the query
        query = query.eq('inverter', inverterFilter.trim());
    }
    //get all inventare
    const {data: inventare, error: inventareError} = await query;
    if(inventareError){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: inventare})
}

function toInventarData(row: any): InventarData {
  return {
    data: row.data,
    inverter: row.inverter,
    turnoff: row.turn_off,
    turnon: row.turn_on,
    remarks: row.remarks,
    praf: row.praf,
    ventilatoare: row.ventilatoare,
    inventorDeteriorat: row.inventor_deteriorat,
    inventorSunete: row.inventor_sunete,
    parametriiCorecti: row.parametrii_corecti,
    cabluriConectate: row.cabluri_conectate,
    cabluriIntacte: row.cabluri_intacte,
    capaceEtansare: row.capace_etansare,
    porturi: row.porturi,
    impamantare: row.impamantare,
    comutatorCurent: row.comutator_curent,
    suruburi: row.suruburi,
  };
}

export const downloadInventar = async (req: Request, res: Response) => {
  const user_id = req.user;
  const inventarId = req.params['id'];

  if (req.role === 'admin') {
    const { data, error } = await supabase
      .from('inventare')
      .select('user_id, inverter, users(created_by)')
      .eq('id', inventarId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: 'Internal Server Error' });
    if (!data) return res.status(400).json({ error: 'Inventar invalid' });

    const inventarCreatorAdmin = (data.users as unknown as { created_by: string })?.created_by;

    if (data.user_id !== user_id && inventarCreatorAdmin !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

    const{data, error} = await supabase.from('inventare').select('*').eq('id', inventarId).maybeSingle()
    if(error){
        return res.status(500).json({error: 'Internal Server Error'})
    }
    if(!data){
        return res.status(400).json({error: 'Inventar invalid'})
    }

    const filePath = path.join(process.cwd(), 'src', 'assets', 'Check_list_Invertoare_6_luni_AcroForm-3.pdf') 
    const pdfBytes = await fillInventarPdf(toInventarData(data), filePath);

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    const filename = `inventar_${inventarId}_${data.inverter}.pdf`
      .replace(/[^A-Za-z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/pdf');

    res.send(pdfBytes);

}