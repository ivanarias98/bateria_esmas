export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: "Faltan las variables de entorno en Vercel" });
    }

    if (req.method === 'POST') {
        const { key, valueString } = req.body;
        if (!key || !valueString) return res.status(400).json({ error: "Faltan datos" });

        const prefix = key.split(':')[0] + ':';
        const session_id = key.split(':')[1] || 'desconocida';
        const dataParsed = JSON.parse(valueString);

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/respuestas_experimentos`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ session_id, experimento_prefix: prefix, datos: dataParsed })
            });
            return res.status(response.status).json({ success: response.ok });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'GET') {
        const { action, prefix, dbid } = req.query;

        if (action === 'list' && prefix) {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/respuestas_experimentos?experimento_prefix=eq.${prefix}&select=id,session_id`, {
                    method: 'GET',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                if (!response.ok) return res.status(response.status).json({ keys: [] });
                const rows = await response.json();
                return res.status(200).json({ keys: rows.map(row => `${prefix}dbid_${row.id}`) });
            } catch (error) { return res.status(500).json({ keys: [] }); }
        }

        if (action === 'get' && dbid) {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/respuestas_experimentos?id=eq.${dbid}&select=datos`, {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Accept': 'application/vnd.pgrst.object+json'
                    }
                });
                if (!response.ok) return res.status(response.status).json({ value: null });
                const row = await response.json();
                return res.status(200).json({ value: JSON.stringify(row.datos) });
            } catch (error) { return res.status(500).json({ value: null }); }
        }
    }
    return res.status(405).json({ error: "Método no permitido" });
}