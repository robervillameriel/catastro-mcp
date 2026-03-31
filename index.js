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
      serverInfo: { name: 'catastro-mcp', version: '1.0.0' }
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
        serverInfo: { name: 'catastro-mcp', version: '1.0.0' }
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
            description: 'Busca datos catastrales por referencia catastral de 20 caracteres',
            inputSchema: {
              type: 'object',
              properties: {
                referencia: { type: 'string', description: 'Referencia catastral de 20 caracteres' }
              },
              required: ['referencia']
            }
          },
          {
            name: 'buscar_por_direccion',
            description: 'Busca datos catastrales por direccion en Madrid',
            inputSchema: {
              type: 'object',
              properties: {
                tipo_via: { type: 'string', description: 'Tipo de via: CL, AV, PZ, etc.' },
                nombre_via: { type: 'string', description: 'Nombre de la calle sin el tipo' },
                numero: { type: 'string', description: 'Numero del portal' }
              },
              required: ['tipo_via', 'nombre_via', 'numero']
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
        url = 'https://ovc.catastro.meh.es/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?RC=' + encodeURIComponent(args.referencia);
      } else if (name === 'buscar_por_direccion') {
        url = 'https://ovc.catastro.meh.es/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=MADRID&Municipio=MADRID&TipoVia=' + encodeURIComponent(args.tipo_via) + '&NomVia=' + encodeURIComponent(args.nombre_via) + '&Numero=' + encodeURIComponent(args.numero);
      } else {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found' } });
      }
      const response = await fetch(url);
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
