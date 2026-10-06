(() => {
  'use strict';
  const $=id=>document.getElementById(id), main=document.querySelector('main');
  let workspace,port,writer,reader,bleDevice,bleTx,bleRx,active='',running=false;
  const SERVICE='6e400001-b5a3-f393-e0a9-e50e24dcca9e',TX='6e400002-b5a3-f393-e0a9-e50e24dcca9e',RX='6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  const log=m=>{$('console').textContent+=`[${new Date().toLocaleTimeString('pt-BR')}] ${m}\n`;$('console').scrollTop=$('console').scrollHeight;};
  function status(){const u=!!port,b=!!bleDevice?.gatt?.connected;for(const [id,on,name] of [['statusUsb',u,'USB'],['statusBle',b,'Bluetooth LE']]){const e=$(id);e.className='status '+(on?'connected':'disconnected');e.textContent=`${name}: ${on?'conectado':'desconectado'}`;}$('statusActive').textContent='Canal ativo: '+(active||'nenhum');$('btnDisconnect').disabled=!(u||b);}
  function panels(open){main.classList.toggle('right-panel-collapsed',!open);$('btnShowRightPanel').textContent=open?'Ocultar painel ◂':'Mostrar painel ▸';$('btnShowRightPanel').setAttribute('aria-expanded',String(open));$('toggleRightPanel').textContent=open?'›':'‹';$('toggleRightPanel').setAttribute('aria-expanded',String(open));if(workspace)setTimeout(()=>Blockly.svgResize(workspace),220);}
  $('btnShowRightPanel').onclick=() =>panels(main.classList.contains('right-panel-collapsed'));
  $('toggleRightPanel').onclick=() =>panels(main.classList.contains('right-panel-collapsed'));
  document.querySelectorAll('.card-toggle').forEach(btn=>btn.onclick=()=>{const card=$(btn.dataset.card),body=card.querySelector('.card-body');body.hidden=!body.hidden;btn.textContent=body.hidden?'+':'−';btn.setAttribute('aria-expanded',String(!body.hidden));});
  $('btnClearConsole').onclick=()=>$('console').textContent='';
  $('iblocksEnter').onclick=()=>{$('iblocksSplash').classList.add('splash-hidden');setTimeout(()=>{if(workspace)Blockly.svgResize(workspace);},100);};
  $('iblocksEnter').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('iblocksEnter').click();}};
  const varName=id=>workspace.getVariableById(id)?.name||'x';
  const safeName=name=>'v_'+String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_]/g,'_');
  const child=(b,input)=>b?.getInputTargetBlock(input);
  const number=(v,min,max)=>Math.min(max,Math.max(min,Math.round(Number(v)||0)));
  function expression(b){
    if(!b)return '0';
    switch(b.type){
      case 'numero_inteiro':return String(Number(b.getFieldValue('NUM'))||0);
      case 'math_number':return String(Number(b.getFieldValue('NUM'))||0);
      case 'temperatures':return `readTemperature_${number(b.getFieldValue('PORT'),0,48)}()`;
      case 'analog_read':return `analogRead(${number(b.getFieldValue('PORT'),0,48)})`;
      case 'variavel_valor':return safeName(varName(b.getFieldValue('VAR')));
      case 'logic_boolean':return b.getFieldValue('BOOL')==='TRUE'?'true':'false';
      case 'logica_comparacao':{const op={EQ:'==',NEQ:'!=',GTE:'>=',LTE:'<=',GT:'>',LT:'<'}[b.getFieldValue('OP')]||'==';return `(${expression(child(b,'A'))} ${op} ${expression(child(b,'B'))})`;}
      case 'logic_compare':{const op={EQ:'==',NEQ:'!=',GT:'>',LT:'<',GTE:'>=',LTE:'<='}[b.getFieldValue('OP')]||'==';return `(${expression(child(b,'A'))} ${op} ${expression(child(b,'B'))})`;}
      case 'logic_operation':return `(${expression(child(b,'A'))} ${b.getFieldValue('OP')==='AND'?'&&':'||'} ${expression(child(b,'B'))})`;
      case 'logic_negate':return `(!${expression(child(b,'BOOL'))})`;
      case 'math_arithmetic':{const op={ADD:'+',MINUS:'-',MULTIPLY:'*',DIVIDE:'/'}[b.getFieldValue('OP')]||'+';return `(${expression(child(b,'A'))} ${op} ${expression(child(b,'B'))})`;}
      default:return '0';
    }
  }
  function statements(b,depth=0){const pad='  '.repeat(depth);let lines=[];for(let n=b;n;n=n.getNextBlock()){
    if(n.type==='esperar_ms')lines.push(`${pad}delay(${number(n.getFieldValue('MS'),0,2147483647)});`);
    if(n.type==='digital_write'){const pin=number(n.getFieldValue('PORT'),0,48),state=n.getFieldValue('STATE')==='HIGH'?'HIGH':'LOW';lines.push(`${pad}digitalWrite(${pin}, ${state});`);}
    if(n.type==='servo_write'){
      const pin=number(n.getFieldValue('PORT'),0,48),angle=number(n.getFieldValue('ANGLE'),0,180);
      if(angle===0)lines.push(`${pad}servo_${pin}.detach();`,`${pad}digitalWrite(${pin}, LOW);`);
      else lines.push(`${pad}if (!servo_${pin}.attached()) servo_${pin}.attach(${pin}, 500, 2400);`,`${pad}servo_${pin}.write(${angle});`);
    }
    if(n.type==='analog_write'){const pin=number(n.getFieldValue('PORT'),0,48),value=number(n.getFieldValue('VALUE'),0,255);lines.push(`${pad}analogWrite(${pin}, ${value});`);}
    if(n.type==='atribuir_inteiro')lines.push(`${pad}${safeName(varName(n.getFieldValue('VAR')))} = ${expression(child(n,'VALUE'))};`);
    if(n.type==='exibir_variavel')lines.push(`${pad}Serial.println(${safeName(varName(n.getFieldValue('VAR')))});`);
    if(n.type==='repita_vezes')lines.push(`${pad}for (int contador_${depth}=0; contador_${depth}<${expression(child(n,'TIMES'))}; contador_${depth}++) {`,statements(child(n,'DO'),depth+1),`${pad}}`);
    if(n.type==='repita_enquanto')lines.push(`${pad}while (${expression(child(n,'COND'))}) {`,statements(child(n,'DO'),depth+1),`${pad}}`);
    if(n.type==='para_variavel'){const v=safeName(varName(n.getFieldValue('VAR'))),from=expression(child(n,'FROM')),to=expression(child(n,'TO')),by=expression(child(n,'BY'));lines.push(`${pad}for (${v}=${from}; (${by})>0 ? ${v}<=(${to}) : ${v}>=(${to}); ${v}+=(${by})) {`,statements(child(n,'DO'),depth+1),`${pad}}`);}
    if(n.type==='controls_if'){let index=0;while(n.getInput('IF'+index)){lines.push(`${pad}${index?'else if':'if'} (${expression(child(n,'IF'+index))}) {`,statements(child(n,'DO'+index),depth+1),`${pad}}`);index++;}if(n.getInput('ELSE'))lines.push(`${pad}else {`,statements(child(n,'ELSE'),depth+1),`${pad}}`);}
  }return lines.filter(Boolean).join('\n');}
  function updateCode(){
    if(!workspace)return;
    const start=workspace.getTopBlocks(true).find(b=>b.type==='inicio');
    const connected=start?start.getDescendants(false):[];
    const pins=new Map();
    for(const block of connected){
      if(block.type==='digital_write'||block.type==='analog_write'||block.type==='servo_write')pins.set(number(block.getFieldValue('PORT'),0,48),'OUTPUT');
      if(block.type==='analog_read'){
        const pin=number(block.getFieldValue('PORT'),0,48);
        if(!pins.has(pin))pins.set(pin,'INPUT');
      }
    }
    const servoPins=[...new Set(connected.filter(b=>b.type==='servo_write').map(b=>number(b.getFieldValue('PORT'),0,48)))].sort((a,b)=>a-b);
    const servoDeclarations=servoPins.length?'#include <ESP32Servo.h>\n\n'+servoPins.map(pin=>`Servo servo_${pin};`).join('\n')+'\n\n':'';
    const temperaturePins=[...new Set(connected.filter(b=>b.type==='temperatures').map(b=>number(b.getFieldValue('PORT'),0,48)))].sort((a,b)=>a-b);
    const temperatureDeclarations=temperaturePins.length?'#include <OneWire.h>\n#include <DallasTemperature.h>\n\n'+temperaturePins.map(pin=>`OneWire oneWire_${pin}(${pin});\nDallasTemperature temperatures_${pin}(&oneWire_${pin});\n\nfloat readTemperature_${pin}() {\n  temperatures_${pin}.requestTemperatures();\n  return temperatures_${pin}.getTempCByIndex(0);\n}`).join('\n\n')+'\n\n':'';
    const setup=[];
    for(const pin of temperaturePins)setup.push(`  temperatures_${pin}.begin();`, `  temperatures_${pin}.setResolution(12);`, `  temperatures_${pin}.setWaitForConversion(true);`);
    for(const pin of servoPins)setup.push(`  servo_${pin}.setPeriodHertz(50);`);
    if(connected.some(block=>block.type==='exibir_variavel'))setup.push('  Serial.begin(115200);');
    for(const [pin,mode] of [...pins].sort((a,b)=>a[0]-b[0]))setup.push(`  pinMode(${pin}, ${mode});`);
    const vars=workspace.getAllVariables().map(v=>`double ${safeName(v.name)} = 0;`).join('\n');
    $('generatedCode').textContent=`//MyBlocks by Openrobotics\n${servoDeclarations}${temperatureDeclarations}${vars?vars+'\n\n':''}void setup() {\n${setup.join('\n')}\n}\n\nvoid loop() {\n${start?statements(child(start,'DO'),1):'  // Insert a loop block.'}\n}`;
  }
  function init(){if(!window.Blockly){$('blocklyError').textContent='Blockly não carregou. Conecte-se à internet e reabra a página.';log('Biblioteca Blockly indisponível.');return;}workspace=Blockly.inject('blocklyDiv',{toolbox:window.myToolbox,trashcan:true,scrollbars:true,zoom:{controls:true,wheel:true,startScale:1,maxScale:2,minScale:.5},grid:{spacing:20,length:3,colour:'#e2e8f0',snap:false}});workspace.registerButtonCallback('CREATE_VARIABLE',()=>Blockly.Variables.createVariableButtonHandler(workspace));const start=workspace.newBlock('inicio');start.initSvg();start.render();start.moveBy(70,70);workspace.addChangeListener(updateCode);updateCode();}
  $('btnClear').onclick=()=>{if(!workspace)return;workspace.clear();const b=workspace.newBlock('inicio');b.initSvg();b.render();b.moveBy(70,70);updateCode();};
  let pending=null,usbBuffer='',bleBuffer='';
  function receiveLine(line,channel){
    line=line.trim();
    if(!line||!pending||pending.channel!==channel)return;
    if(line.startsWith('ERR ')){pending.reject(new Error(line));return;}
    if(pending.match(line))pending.resolve(line);
  }
  function feed(text,channel){
    let buffer=(channel==='USB'?usbBuffer:bleBuffer)+text;
    // BLE notification packets contain complete response lines.
    if(channel==='Bluetooth LE'&&!buffer.includes('\n'))buffer+='\n';
    const lines=buffer.split('\n');const tail=lines.pop();
    if(channel==='USB')usbBuffer=tail.slice(-512);else bleBuffer=tail.slice(-512);
    lines.forEach(line=>receiveLine(line,channel));
  }
  async function write(value){
    const bytes=new TextEncoder().encode(value+'\n');
    if(active==='USB'&&writer)await writer.write(bytes);
    else if(active==='Bluetooth LE'&&bleTx)await bleTx.writeValue(bytes);
    else throw Error('Connect a board first.');
  }
  function request(value,match,timeout=2500){
    if(pending)return Promise.reject(new Error('A device request is already pending.'));
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(reject,new Error('Device response timeout.')),timeout);
      const finish=(callback,result)=>{clearTimeout(timer);pending=null;callback(result);};
      pending={channel:active,match,resolve:line=>finish(resolve,line),reject:error=>finish(reject,error)};
      write(value).catch(error=>{if(pending)pending.reject(error);});
    });
  }
  async function send(value){const command=value.split(' ')[0];await request(value,line=>line===`OK ${command}`);}
  $('btnConnectUsb').onclick=async()=>{
    if(port)return;
    if(!navigator.serial){log('Web Serial unavailable.');return;}
    try{
      port=await navigator.serial.requestPort();await port.open({baudRate:115200});
      writer=port.writable.getWriter();active='USB';usbBuffer='';status();
      const thisPort=port;const usbReader=thisPort.readable.getReader();reader=usbReader;
      (async()=>{try{const dec=new TextDecoder();while(true){const {value,done}=await usbReader.read();if(done)break;if(value)feed(dec.decode(value,{stream:true}),'USB');}}
      catch(e){if(port===thisPort){if(pending)pending.reject(e);log('USB read error: '+e.message);}}
      finally{usbReader.releaseLock();if(reader===usbReader)reader=null;}})();
      $('console').textContent='';log('USB ping');
      let pong=false;
      for(let attempt=0;attempt<4&&!pong;attempt++)try{await request('PING',line=>line==='PONG',1800);pong=true;}catch(e){if(attempt===3)throw e;}
      log('USB pong');
    }catch(e){log('USB: '+e.message);}
  };
  $('btnConnectBle').onclick=async()=>{if(!navigator.bluetooth){log('Web Bluetooth indisponível no navegador.');return;}try{bleDevice=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[SERVICE]});bleDevice.addEventListener('gattserverdisconnected',()=>{bleTx=null;bleRx=null;if(active==='Bluetooth LE')active=port?'USB':'';status();log('Bluetooth desconectado.');});const server=await bleDevice.gatt.connect(),service=await server.getPrimaryService(SERVICE);bleTx=await service.getCharacteristic(TX);try{bleRx=await service.getCharacteristic(RX);await bleRx.startNotifications();bleRx.addEventListener('characteristicvaluechanged',e=>feed(new TextDecoder().decode(e.target.value),'Bluetooth LE'));}catch(e){log('Bluetooth conectado sem notificações de leitura: '+e.message);}active='Bluetooth LE';status();log('Bluetooth conectado: '+(bleDevice.name||'ESP32'));}catch(e){log('Bluetooth: '+e.message);bleDevice=null;status();}};
  $('btnDisconnect').onclick=async()=>{running=false;try{if(pending)pending.reject(new Error('Disconnected'));if(reader){await reader.cancel();reader=null;}if(writer){writer.releaseLock();writer=null;}if(port){await port.close();port=null;}if(bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();}catch(e){log('Desconexão: '+e.message);}writer=null;port=null;bleDevice=null;bleTx=null;bleRx=null;active='';status();log('Placa desconectada.');};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const variables=new Map();let steps=0;
  async function delayMs(ms){const end=Date.now()+Math.min(2147483647,Math.max(0,ms));while(running&&Date.now()<end)await wait(Math.min(40,end-Date.now()));}
  async function checkpoint(){if(!running)throw Error('Execução interrompida');if(++steps%40===0)await wait(0);}
  async function evaluate(b){
    if(!b)return 0;
    const e=input=>evaluate(child(b,input));
    switch(b.type){
      case 'numero_inteiro':case 'math_number':return Number(b.getFieldValue('NUM'))||0;
      case 'temperatures':{const pin=number(b.getFieldValue('PORT'),0,48);const line=await request(`TEMP ${pin}`,v=>v.startsWith(`TEMP ${pin} `),4000);const value=Number(line.split(/\s+/)[2]);if(!Number.isFinite(value)||value===-127)throw Error('DS18B20 disconnected or invalid temperature');return value;}
      case 'analog_read':{const pin=number(b.getFieldValue('PORT'),0,48);const line=await request(`AREAD ${pin}`,v=>v.startsWith(`AREAD ${pin} `));const value=Number(line.split(/\s+/)[2]);if(!Number.isFinite(value))throw Error('Invalid analogRead response');return value;}
      case 'variavel_valor':return variables.get(b.getFieldValue('VAR'))??0;
      case 'logic_boolean':return b.getFieldValue('BOOL')==='TRUE';
      case 'logica_comparacao':case 'logic_compare':{const a=await e('A'),c=await e('B');switch(b.getFieldValue('OP')){case 'EQ':return a==c;case 'NEQ':return a!=c;case 'GT':return a>c;case 'LT':return a<c;case 'GTE':return a>=c;case 'LTE':return a<=c;}return false;}
      case 'logic_operation':{const a=Boolean(await e('A'));return b.getFieldValue('OP')==='AND'?(a&&Boolean(await e('B'))):(a||Boolean(await e('B')));}
      case 'logic_negate':return !(await e('BOOL'));
      case 'math_arithmetic':{const a=await e('A'),c=await e('B');switch(b.getFieldValue('OP')){case 'ADD':return a+c;case 'MINUS':return a-c;case 'MULTIPLY':return a*c;case 'DIVIDE':return c?a/c:0;}return 0;}
      default:return 0;
    }
  }
  async function execute(first){for(let b=first;b;b=b.getNextBlock()){
    await checkpoint();
    if(b.type==='esperar_ms')await delayMs(number(b.getFieldValue('MS'),0,2147483647));
    if(b.type==='digital_write')await send(`DWRITE ${number(b.getFieldValue('PORT'),0,48)} ${b.getFieldValue('STATE')==='HIGH'?1:0}`);
    if(b.type==='servo_write')await send(`SERVO ${number(b.getFieldValue('PORT'),0,48)} ${number(b.getFieldValue('ANGLE'),0,180)}`);
    if(b.type==='analog_write')await send(`AWRITE ${number(b.getFieldValue('PORT'),0,48)} ${number(b.getFieldValue('VALUE'),0,255)}`);
    if(b.type==='atribuir_inteiro')variables.set(b.getFieldValue('VAR'),await evaluate(child(b,'VALUE')));
    if(b.type==='exibir_variavel')log(`${varName(b.getFieldValue('VAR'))}: ${variables.get(b.getFieldValue('VAR'))??0}`);
    if(b.type==='repita_vezes'){const times=Math.min(10000,Math.max(0,Math.floor(Number(await evaluate(child(b,'TIMES')))||0)));for(let i=0;i<times&&running;i++)await execute(child(b,'DO'));}
    if(b.type==='repita_enquanto'){while(running&&(await evaluate(child(b,'COND')))){await checkpoint();await execute(child(b,'DO'));}}
    if(b.type==='para_variavel'){const id=b.getFieldValue('VAR'),from=Number(await evaluate(child(b,'FROM'))),to=Number(await evaluate(child(b,'TO'))),step=Number(await evaluate(child(b,'BY')));if(!step)throw Error('O passo do bloco contar deve ser diferente de zero.');for(let v=from;running&&(step>0?v<=to:v>=to);v+=step){variables.set(id,v);await checkpoint();await execute(child(b,'DO'));}}
    if(b.type==='controls_if'){let i=0,matched=false;while(b.getInput('IF'+i)){if(await evaluate(child(b,'IF'+i))){await execute(child(b,'DO'+i));matched=true;break;}i++;}if(!matched&&b.getInput('ELSE'))await execute(child(b,'ELSE'));}
  }}
  $('btnRun').onclick=async()=>{if(!workspace||running)return;const start=workspace.getTopBlocks(true).find(b=>b.type==='inicio');if(!start){log('Adicione o bloco loop.');return;}running=true;steps=0;variables.clear();$('btnRun').disabled=true;$('btnStop').disabled=false;try{log('Execução iniciada.');while(running){await checkpoint();await execute(child(start,'DO'));await wait(0);}log('Execução encerrada.');}catch(e){if(e.message!=='Execução interrompida')log('Erro: '+e.message);}finally{running=false;$('btnRun').disabled=false;$('btnStop').disabled=true;}};
  $('btnStop').onclick=()=>{running=false;log('Parada solicitada.');};
  status();init();
})();
