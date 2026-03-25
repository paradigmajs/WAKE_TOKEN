const fs = require('fs');
const path = require('path');
const solc = require('solc');
function findSources(dir){let files=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()) files=files.concat(findSources(p)); else if(ent.isFile() && p.endsWith('.sol')) files.push(p);}return files;}
const sources={};
for(const file of findSources(path.join(process.cwd(),'contracts'))){sources[path.relative(process.cwd(),file)]={content:fs.readFileSync(file,'utf8')};}
function findImports(importPath){const candidates=[path.join(process.cwd(), importPath),path.join(process.cwd(),'contracts', importPath),path.join(process.cwd(),'node_modules', importPath)]; for(const c of candidates){if(fs.existsSync(c)) return {contents:fs.readFileSync(c,'utf8')};} return {error:'File not found: '+importPath};}
const input={language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const output=JSON.parse(solc.compile(JSON.stringify(input), {import: findImports}));
if(output.errors){for(const e of output.errors){console.log(e.formattedMessage);} const fatal=output.errors.filter(e=>e.severity==='error'); if(fatal.length) process.exit(1);}
console.log('Contracts compiled:', Object.keys(output.contracts||{}).length);
