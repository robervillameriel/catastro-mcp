import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.get('/mcp', (req, res) => {
  res.json({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'catastro-mcp', version: '4.0.0' }
    }
  });
});

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'catastro-mcp', version: '4.0.0' }
      }
    });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        tools: [
          {
            name: 'buscar_por_referencia',
            description: 'Busca datos geométricos de una PARCELA catastral (solar/edificio completo). Usar cuando la referencia tenga 14 caracteres o cuando interese la geometría y superficie del suelo.',
            inputSchema: {
              type: 'object',
              properties: {
                referencia: { type: 'string', description: 'Referencia catastral de 14 caracteres (parcela)' }
              },
              required: ['referencia']
            }
          },
          {
            name: 'buscar_por_direccion',
            description: 'Busca datos catastrales por dirección postal en Madrid. Devuelve la referencia catastral completa de 20 caracteres.',
            inputSchema: {
              type: 'object',
              properties: {
                tipo_via: { type: 'string', description: 'Tipo de vía: CL, AV, PZ, etc.' },
                nombre_via: { type: 'string', description: 'Nombre de la calle sin el tipo' },
                numero: { type: 'string', description: 'Número del portal' }
              },
              required: ['tipo_via', 'nombre_via', 'numero']
            }
          },
          {
            name: 'buscar_por_inmueble',
            description: 'Busca datos detallados de un INMUEBLE concreto (piso, local, garaje...) usando la referencia catastral completa de 20 caracteres. Devuelve superficie construida, uso, año de construcción y dirección. Usar siempre que se evalúe una subasta o un inmueble específico dentro de un edificio.',
            inputSchema: {
              type: 'object',
              properties: {
                referencia: { type: 'string', description: 'Referencia catastral completa de 20 caracteres' }
              },
              required: ['referencia']
            }
          },
          {
            name: 'buscar_subasta_boe',
            description: 'Obtiene datos completos de una subasta del portal BOE dado su ID (ej. SUB-JA-2025-253326). Devuelve valor de tasación, precio mínimo de puja, importe del depósito, tramos, cantidad reclamada, referencia catastral y fechas de inicio y fin.',
            inputSchema: {
              type: 'object',
              properties: {
                idSub: { type: 'string', description: 'ID de la subasta, ej. SUB-JA-2025-253326' }
              },
              required: ['idSub']
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      let url;

      if (name === 'buscar_por_referencia') {
        url = 'https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx?service=wfs&version=2&request=getfeature&STOREDQUERIE_ID=GetParcel&srsname=EPSG:4326&REFCAT=' + encodeURIComponent(args.referencia);

      } else if (name === 'buscar_por_direccion') {
        url = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/ConsultaNumero?Provincia=Madrid&Municipio=Madrid&TipoVia=' + encodeURIComponent(args.tipo_via) + '&NomVia=' + encodeURIComponent(args.nombre_via) + '&Numero=' + encodeURIComponent(args.numero);

      } else if (name === 'buscar_por_inmueble') {
        url = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=Madrid&Municipio=Madrid&RC=' + encodeURIComponent(args.referencia);

      } else if (name === 'buscar_subasta_boe') {
        url = 'https://subastas.boe.es/reg/soa/lote.php?idSub=' + encodeURIComponent(args.idSub) + '&ver=3&idLote=1';

      } else {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found' } });
      }

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CatastroMCP/4.0)' }
      });
      const text = await response.text();
      return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });

    } catch (err) {
      return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message } });
    }
  }

  return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Catastro MCP server running on port ' + PORT));
