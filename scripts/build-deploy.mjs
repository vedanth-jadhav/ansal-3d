/* Deployment-only wrapper: never run in local QA. The user-owned beacon token
 * is retained in this private source tree, not in local test HTML. */
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
execFileSync('npm',['run','build'],{stdio:'inherit'});
const path='dist/index.html',html=fs.readFileSync(path,'utf8');
const script=`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"40ccaddfaff443ddb72a7688dd0ddd06"}'></script>`;
if(!html.includes('static.cloudflareinsights.com'))fs.writeFileSync(path,html.replace('</head>',script+'</head>'));
console.log('deployment HTML includes Cloudflare Web Analytics');
