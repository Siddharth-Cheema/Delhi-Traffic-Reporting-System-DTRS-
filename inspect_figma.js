import https from 'https';

const token = process.env.FIGMA_TOKEN || 'YOUR_FIGMA_TOKEN_HERE';
const fileId = 'nenkpLPkmazCGyHafE5emP'; // Extracted from URL

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${fileId}`,
  method: 'GET',
  headers: {
    'X-Figma-Token': token
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`Document Name: ${json.name}`);
      console.log(`Version: ${json.version}`);
      
      if (json.document && json.document.children) {
        console.log("\nPages:");
        json.document.children.forEach(page => {
           console.log(`- Page: ${page.name}`);
           if(page.children) {
               page.children.forEach(frame => {
                   console.log(`  - Frame/Screen: ${frame.name} (Type: ${frame.type})`);
               });
           }
        });
      }
    } catch (e) {
      console.error("Error parsing JSON", e);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
