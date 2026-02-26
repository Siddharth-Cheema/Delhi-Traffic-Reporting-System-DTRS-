import https from 'https';
import fs from 'fs';

const token = process.env.FIGMA_TOKEN || 'YOUR_FIGMA_TOKEN_HERE';
const fileId = 'nenkpLPkmazCGyHafE5emP';

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
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      fs.writeFileSync('figma_screens_raw.json', JSON.stringify(json, null, 2));
      
      const summary = {};
      
      if (json.document && json.document.children) {
        json.document.children.forEach(page => {
           if(page.children) {
               page.children.forEach(frame => {
                   if (frame.type === 'FRAME' && frame.name !== 'Frame 3' && frame.name !== 'Frame 76') {
                       summary[frame.name] = { texts: [], buttons: [] };
                       extractContent(frame, summary[frame.name]);
                   }
               });
           }
        });
      }
      
      fs.writeFileSync('figma_ui_summary.json', JSON.stringify(summary, null, 2));
      console.log("Extracted UI details to figma_ui_summary.json");
      
    } catch (e) {
      console.error("Error parsing JSON", e);
    }
  });
});

function extractContent(node, summaryObj) {
    if (!node) return;
    
    // Extract text
    if (node.type === 'TEXT' && node.characters) {
        summaryObj.texts.push(node.characters.trim().replace(/\n/g, ' '));
    }
    
    // Naive button detection (rectangles/frames with text inside, or explicit buttons)
    if (node.type === 'INSTANCE' || (node.type === 'FRAME' && (node.name.toLowerCase().includes('button') || node.name.toLowerCase().includes('btn')))) {
        let btnText = "Icon/Unknown Button";
        if (node.children) {
            const textNode = node.children.find(c => c.type === 'TEXT');
            if (textNode) btnText = textNode.characters.trim().replace(/\n/g, ' ');
        }
        summaryObj.buttons.push({ name: node.name, text: btnText });
    }
    
    if (node.children) {
        node.children.forEach(child => extractContent(child, summaryObj));
    }
}

req.end();
