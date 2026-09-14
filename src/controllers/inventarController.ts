import type { Request, Response } from "express";
import { supabase } from "../lib/supabaseClient.js";
import { error } from "node:console";

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
    inverter: string
}

function isValidInventar(body: any): body is Inventar{

    for(const field of ['praf', 'ventilatoare', 'inventorDeteriorat', 'inventorSunete', 'parametriiCorecti', 
        'cabluriConectate', 'cabluriIntacte', 'capaceEtansare', 'porturi', 'impamantare', 'comutatorCurent', 'suruburi']){

            const v = body[field];
            if(typeof v !== 'boolean')
                return false;
        }
    
    if(typeof body['remarks'] !== 'string' || typeof body['data'] !== 'string' || typeof body['inverter'] !== 'string' )
        return false;

    if(body['data'] === '' || body['inverter'].trim() === '')
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
    remarks, inverter, data} = req.body

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
        'data': data
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
    remarks, inverter, data} = req.body

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
        'data': data
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