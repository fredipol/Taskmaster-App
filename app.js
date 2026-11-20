const screen = document.querySelector('#screen');
const ENABLE_GREEN_STAGE_SKIP = true;
const ENABLE_RED_STAGE_SKIP = true;
let currentMode = 'UNDECIDED';
let greenStagesSinceCheckIn=0;
let passcodeSubmissionAttempts=0;
let waitTimer;
let currentAudio=null;
let bubbleTimer=null;
let breathingTimer=null;
let progressTimer=null;
let memoryTimer=null;
let drawingDistance=0;
let starAnimationFrame=null;
let humPitchInterval=null;
let humPitchEndTimer=null;
let humMessageTimer=null;
let humOscillator=null;
let humGain=null;
let humAudioContext=null;
let popAudioContext=null;
let ignoreScreenTapsUntil=0;
const skipMusicForTesting=false;

screen.addEventListener('click', event => {
  if (performance.now() < ignoreScreenTapsUntil) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

function show({pretitle='', title='', text='', choices=[], input=false, waitMs=0, skipTo=null, redSkipTo=null}={}) {
  ignoreScreenTapsUntil=performance.now()+300;
  clearTimeout(waitTimer);
  clearTimeout(bubbleTimer);
  clearTimeout(breathingTimer);
  clearTimeout(progressTimer);
  clearTimeout(memoryTimer);
  cancelAnimationFrame(starAnimationFrame);
  stopHumPitch();
  bubbleTimer=null;
  breathingTimer=null;
  progressTimer=null;
  memoryTimer=null;
  starAnimationFrame=null;
  screen.classList.remove('dial-page','mindfulness-game','breathing-screen','relaxation-progress','drawing-screen','star-follow-screen','hum-pitch-screen','memory-sequence-screen');
  if (currentAudio) {
    currentAudio.pause();
    currentAudio=null;
  }
  screen.classList.remove('dial-page');
  screen.classList.toggle('rule-page', Boolean(pretitle));
  screen.innerHTML = `${pretitle ? `<p class="pretitle">${pretitle}</p>` : ''}${title ? `<h1>${title}</h1>` : ''}${text ? `<p class="copy">${text}</p>` : ''}${input ? '<form id="number-form"><input id="number" type="text" inputmode="numeric" aria-label="Enter a three digit passcode" autocomplete="off"><div class="buttons"><button class="choice" type="submit">Submit</button></div><dialog id="passcode-error" class="app-dialog"><p></p><button class="choice" type="button">Continue</button></dialog></form>' : ''}<div class="buttons" id="choices"></div>`;
  const buttons = screen.querySelector('#choices');
  const addChoices = items => items.forEach(({label, action}) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.textContent = label;
    button.addEventListener('click', action);
    buttons.append(button);
  });
  if (waitMs) {
    if (text) screen.querySelector('.copy').textContent = `${text}\n\nA button will appear in three minutes.`;
    waitTimer = setTimeout(() => addChoices(choices), waitMs);
  } else addChoices(choices);
  if(skipTo) addGreenSkip(skipTo);
  if(redSkipTo) addRedSkip(redSkipTo);
  if (input) {
    const numberInput=screen.querySelector('#number');
    const errorDialog=screen.querySelector('#passcode-error');
    errorDialog.querySelector('button').addEventListener('click',()=>{
      errorDialog.close();
      numberInput.focus();
    });
    screen.querySelector('#number-form').addEventListener('submit', e => {
    e.preventDefault();
    const number = numberInput.value;
    if (!/^\d{3}$/.test(number) || number==='000') {
      errorDialog.querySelector('p').textContent=number==='000' ? '000 cannot be used as a passcode.' : 'The passcode is a three digit number. Please try again.';
      errorDialog.showModal();
      return;
    }
    if(passcodeSubmissionAttempts===0) {
      passcodeSubmissionAttempts++;
      errorDialog.querySelector('p').textContent='Invalid passcode.';
      errorDialog.showModal();
      return;
    }
    localStorage.setItem('task-passcode', number);
    show({title:'Passcode saved.',text:'Remember your passcode.',choices:[{label:'Continue',action:startPasscodeQuiz}],redSkipTo:startPasscodeQuiz});
    });
  }
}
function addGreenSkip(action) {
  if(!ENABLE_GREEN_STAGE_SKIP||currentMode!=='RELAXED') return;
  const button=document.createElement('button');
  button.type='button';
  button.className='green-skip';
  button.textContent='Skip stage';
  button.addEventListener('click',action);
  screen.append(button);
}
function addRedSkip(action) {
  if(!ENABLE_RED_STAGE_SKIP||currentMode!=='HARD') return;
  const button=document.createElement('button');
  button.type='button';
  button.className='red-skip';
  button.textContent='Skip stage';
  button.addEventListener('click',action);
  screen.append(button);
}

function start() {
  currentMode='UNDECIDED';
  document.body.className='';
  show({title:'Welcome to the Taskmaster App, by Little Fred Pollard.',text:'Please pick a colour to start your journey.',choices:[
    {label:'Blue',action:blueStart},{label:'Red',action:redStart},{label:'Green',action:greenStart}
  ]});
}
function blueStart() {
  currentMode='STANDARD';
  document.body.className='mode-blue';
  show({title:'You have picked Verbal Reasoning Mode. Do you want to continue?',choices:[
    {label:'Continue',action:blueInstruction},
    {label:'Back',action:start}
  ]});
}
function blueInstruction() {
  show({pretitle:'You have activated VERBAL REASONING MODE.',title:'One simple rule:',text:'While the screen is blue, you should always answer the last question, not the current one.',choices:[{label:'Continue',action:understand}]});
}
function understand() { show({title:'Do you understand?',choices:[{label:'Continue',action:hardPrompt}]}); }
function hardPrompt() { show({title:'Do you want more of a challenge?',choices:[{label:'Yes',action:completePrompt},{label:'No',action:blueStart}]}); }
function completePrompt() { show({title:'Do you want to complete the task?',choices:[{label:'Yes',action:redStart},{label:'No',action:forfeitPrompt}]}); }
function forfeitPrompt() { show({title:'Do you want to forfeit this task?',choices:[{label:'Yes',action:relaxedPrompt},{label:'No',action:confirmForfeit}]}); }
function confirmForfeit() { show({title:'Are you sure?',choices:[{label:'Yes',action:continuePrompt},{label:'No',action:freeWillA}]}); }
function continuePrompt() { show({title:'Continue?',choices:[{label:'Yes',action:forfeited},{label:'No',action:forfeited}]}); }
function forfeited() { show({title:'Task forfeited.',text:'You will receive zero points.'}); }
function relaxedPrompt() { show({title:'Would you prefer a more relaxed experience?',choices:[{label:'Yes',action:relaxedSure},{label:'No',action:freeWillB}]}); }
function relaxedSure() { show({title:'Are you sure?',choices:[{label:'Yes',action:continuePrompt},{label:'No',action:freeWillA}]}); }
function freeWillA() { show({title:'Do you believe in free will?',choices:[{label:'Yes',action:endlessPrompt},{label:'No',action:forfeitPrompt}]}); }
function freeWillB() { show({title:'Do you believe in free will?',choices:[{label:'Yes',action:greenStart},{label:'No',action:endlessPrompt}]}); }
function endlessPrompt() { show({title:'Are you stuck in an endless loop of predetermined actions?',choices:[{label:'Yes',action:goodForYou},{label:'No',action:skipPrompt}]}); }
function goodForYou() { show({title:'Good for you. Do you want to continue?',choices:[{label:'Yes',action:beginningPrompt},{label:'No',action:tiredPrompt}]}); }
function beginningPrompt() { show({title:'Would you like to go back to the beginning?',choices:[{label:'Yes',action:moreChallenge},{label:'No',action:lowerSure}]}); }
function lowerSure() { show({title:'Are you sure?',choices:[{label:'Yes',action:start},{label:'No',action:beginningPrompt}]}); }
function moreChallenge() { show({title:'Do you want more of a challenge?',choices:[{label:'Yes',action:completePrompt},{label:'No',action:hardPrompt}]}); }
function skipPrompt() { show({title:'Would you like to skip to the end of the task?',choices:[{label:'Yes',action:skipSure},{label:'No',action:tiredPrompt}]}); }
function skipSure() { show({title:'Are you sure?',choices:[{label:'Yes',action:nearlyThere},{label:'No',action:tiredPrompt}]}); }
function tiredPrompt() { show({title:'Are you getting tired of this?',choices:[{label:'Yes',action:finalSure},{label:'No',action:breakPrompt}]}); }
function breakPrompt() { show({title:'Do you want a break?',choices:[{label:'Yes',action:angryPrompt},{label:'No',action:endlessPrompt}]}); }
function angryPrompt() { show({title:'Are you getting angry?',choices:[{label:'Yes',action:greenStart},{label:'No',action:endlessPrompt}]}); }
function finalSure() { show({title:'Are you sure?',choices:[{label:'Yes',action:nearlyThere},{label:'No',action:beginningPrompt}]}); }
function nearlyThere() { show({title:'Nearly there!',choices:[{label:'Yes',action:taskComplete},{label:'No',action:moreChallenge}]}); }
function taskComplete() { show({title:'Task complete. Congratulations.'}); }
function playPopSound() {
  const AudioContextClass=window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  popAudioContext ||= new AudioContextClass();
  if (popAudioContext.state==='suspended') popAudioContext.resume();
  const now=popAudioContext.currentTime;
  const tone=popAudioContext.createOscillator();
  const toneGain=popAudioContext.createGain();
  tone.type='sine';
  tone.frequency.setValueAtTime(480,now);
  tone.frequency.exponentialRampToValueAtTime(95,now+0.1);
  toneGain.gain.setValueAtTime(0.22,now);
  toneGain.gain.exponentialRampToValueAtTime(0.001,now+0.13);
  tone.connect(toneGain).connect(popAudioContext.destination);
  tone.start(now);
  tone.stop(now+0.14);
}

function redStart() {
  currentMode='HARD';
  passcodeSubmissionAttempts=0;
  document.body.className='mode-red';
  show({title:'You have picked Non-Verbal Reasoning Mode. Do you want to continue?',choices:[
    {label:'Continue',action:redPasscodeEntry},
    {label:'Back',action:start}
  ]});
}
function redPasscodeEntry() {
  show({title:'You have activated NON-VERBAL REASONING MODE.',text:'Enter passcode to continue.',input:true,choices:[{label:'Back to start',action:start}]});
}
const passcodeQuestions = [
  {text:'Is your passcode a prime number?', test:n => isPrime(n)},
  {text:'Is your passcode a square number?', test:n => Number.isInteger(Math.sqrt(n))},
  {text:'Is your passcode an even number?', test:n => n % 2 === 0},
  {text:'Does your passcode have three repeated digits?', argument:'digits', test:digits => new Set(digits).size===1},
  {text:'Is your passcode divisible by 7?', test:n => n % 7 === 0},
  {text:'Does your passcode contain a zero?', argument:'digits', test:digits => digits.includes('0')},
  {text:'Are the three digits in ascending order?', argument:'digits', test:digits => digits[0]<digits[1] && digits[1]<digits[2]},
  {text:'Is the sum of your passcode’s digits greater than 13?', argument:'digits', test:digits => [...digits].reduce((sum,digit)=>sum+Number(digit),0)>13}
];
let passcodeQuestionIndex = 0;

function isPrime(number) {
  if (number < 2) return false;
  for (let divisor=2; divisor*divisor<=number; divisor++) if (number % divisor===0) return false;
  return true;
}
function startPasscodeQuiz() {
  passcodeQuestionIndex=0;
  askPasscodeQuestion();
}
function askPasscodeQuestion() {
  const question=passcodeQuestions[passcodeQuestionIndex];
  show({title:question.text,choices:[{label:'Yes',action:()=>answerPasscodeQuestion(true)},{label:'No',action:()=>answerPasscodeQuestion(false)}],redSkipTo:skipPasscodeQuestion});
}
function skipPasscodeQuestion() {
  passcodeQuestionIndex++;
  if(passcodeQuestionIndex<passcodeQuestions.length) askPasscodeQuestion();
  else memoryTestIntro();
}
function answerPasscodeQuestion(answer) {
  const digits=localStorage.getItem('task-passcode') || '';
  const number=Number(digits);
  const question=passcodeQuestions[passcodeQuestionIndex];
  const expected=question.test(question.argument==='digits' ? digits : number);
  if (answer!==expected) {
    show({title:'That answer is incorrect.',text:'Please enter your passcode again.',choices:[{label:'Enter passcode',action:redStart}],redSkipTo:memoryTestIntro});
    return;
  }
  passcodeQuestionIndex++;
  if (passcodeQuestionIndex<passcodeQuestions.length) askPasscodeQuestion();
  else show({title:'Mathematical capabilities demonstrated',choices:[{label:'Continue',action:memoryTestIntro}],redSkipTo:memoryTestIntro});
}
const memorySymbols=['↑','→','↓','←'];
const memorySequences=[
  ['↑','→','↑'],
  ['↓','←','→'],
  ['↑','↓','←','↑'],
  ['→','→','↑','←'],
  ['←','↑','→','↓','←'],
  ['↓','→','↑','→','←']
];
function memoryTestIntro() {
  show({title:'Sequential symbol memory assessment.',text:'Watch each sequence, then tap the symbols in the same order. There are six questions.',choices:[{label:'Begin',action:()=>showMemorySequence(0)}],redSkipTo:()=>showMemorySequence(0)});
}
function showMemorySequence(index) {
  if(index>=memorySequences.length) {
    show({title:'Sequential memory demonstrated.',choices:[{label:'Continue',action:lateralReasoningIntro}],redSkipTo:lateralReasoningIntro});
    return;
  }
  const sequence=memorySequences[index];
  show({title:`Question ${index+1} of 6`,text:'Watch carefully.'});
  screen.classList.add('memory-sequence-screen');
  screen.innerHTML=`<h1>Question ${index+1} of 6</h1><p class="memory-instruction">Watch carefully.</p><div class="memory-symbol" aria-live="polite"></div><p class="memory-status"></p>`;
  addRedSkip(()=>showMemorySequence(index+1));
  const symbolDisplay=screen.querySelector('.memory-symbol');
  const instruction=screen.querySelector('.memory-instruction');
  const status=screen.querySelector('.memory-status');
  let position=0;
  function displayNext() {
    if(position>=sequence.length) {
      instruction.textContent='Now tap the symbols in the same order.';
      status.textContent=`0 of ${sequence.length}`;
      showMemoryOptions(index,sequence,[]);
      return;
    }
    symbolDisplay.textContent=sequence[position];
    status.textContent=`Symbol ${position+1} of ${sequence.length}`;
    memoryTimer=setTimeout(()=>{
      symbolDisplay.textContent='';
      position++;
      memoryTimer=setTimeout(displayNext,260);
    },850);
  }
  displayNext();
}
function showMemoryOptions(index,sequence,answer) {
  const instruction=screen.querySelector('.memory-instruction');
  const status=screen.querySelector('.memory-status');
  const symbolDisplay=screen.querySelector('.memory-symbol');
  symbolDisplay.textContent='';
  screen.querySelector('.memory-options')?.remove();
  const options=document.createElement('div');
  options.className='memory-options';
  for(const symbol of memorySymbols) {
    const button=document.createElement('button');
    button.className='choice memory-choice';
    button.type='button';
    button.textContent=symbol;
    button.setAttribute('aria-label',({ '↑':'Up arrow','→':'Right arrow','↓':'Down arrow','←':'Left arrow' })[symbol]);
    button.addEventListener('click',()=>{
      const nextAnswer=[...answer,symbol];
      status.textContent=`${nextAnswer.length} of ${sequence.length}`;
      if(symbol!==sequence[nextAnswer.length-1]) {
        show({title:'Not quite.',text:'Watch the sequence again, then have another go.',choices:[{label:'Try again',action:()=>showMemorySequence(index)}],redSkipTo:()=>showMemorySequence(index+1)});
      } else if(nextAnswer.length===sequence.length) {
        showMemorySequence(index+1);
      } else {
        showMemoryOptions(index,sequence,nextAnswer);
      }
    });
    options.append(button);
  }
  instruction.textContent='Now tap the symbols in the same order.';
  screen.append(options);
}
const lateralReasoningQuestions=[
  {prompt:'Which one does not belong?',options:['Apple','Pear','Carrot','Plum'],answer:'Carrot'},
  {prompt:'Which shape is different?',options:['Triangle','Square','Circle','Rectangle'],answer:'Circle'},
  {prompt:'Which object is least like the others?',options:['Hat','Scarf','Glove','Kettle'],answer:'Kettle'},
  {prompt:'Which number is different?',options:['3','5','7','9'],answer:'9'},
  {prompt:'Which one does not belong?',options:['Monday','Tuesday','January','Wednesday'],answer:'January'}
];
function lateralReasoningIntro() {
  show({title:'Lateral reasoning assessment.',text:'Answer five questions by choosing the one that does not belong.',choices:[{label:'Begin',action:()=>showLateralQuestion(0)}],redSkipTo:()=>showLateralQuestion(0)});
}
function showLateralQuestion(index) {
  if(index>=lateralReasoningQuestions.length) {
    show({title:'Lateral reasoning demonstrated.',choices:[{label:'Continue',action:timekeepingTest}],redSkipTo:timekeepingTest});
    return;
  }
  const question=lateralReasoningQuestions[index];
  show({title:`Question ${index+1} of ${lateralReasoningQuestions.length}`,text:question.prompt,choices:question.options.map(option=>({label:option,action:()=>{
    if(option===question.answer) showLateralQuestion(index+1);
    else show({title:'That is not the answer we were looking for.',text:'Have another think.',choices:[{label:'Try again',action:()=>showLateralQuestion(index)}],redSkipTo:()=>showLateralQuestion(index+1)});
  }})),redSkipTo:()=>showLateralQuestion(index+1)});
}
function timekeepingTest() {
  let firstPress=null;
  const press=button => {
    if (firstPress===null) {
      firstPress={button,time:performance.now()};
      return;
    }
    if (button===firstPress.button) return;
    const elapsed=(performance.now()-firstPress.time)/1000;
    if (elapsed>=56 && elapsed<=64) {
      test2Complete();
    } else {
      show({title:'Timekeeping test failed.',text:'Try again?',choices:[{label:'Try Again',action:timekeepingTest},{label:'Back to the Start',action:start}],redSkipTo:test2Complete});
    }
  };
  show({title:'Pass the timekeeping test. Press button A and button B exactly one minute apart.',choices:[
    {label:'A',action:()=>press('A')},{label:'B',action:()=>press('B')}
  ],redSkipTo:test2Complete});
}
function test2Complete() {
  passcodeDialScreen();
}
function redPlaceholder() {
  show({title:'Placeholder screen.'});
}
function passcodeDialScreen() {
  clearTimeout(waitTimer);
  screen.classList.remove('rule-page');
  screen.classList.add('dial-page');
  screen.innerHTML='<h1>Enter your passcode to skip to the end.</h1><div class="dial-row"><span class="dial-value" id="dial-value">000</span><button class="choice plus-button" id="dial-plus" aria-label="Increase number by one">+</button></div><div class="buttons dial-submit"><button class="choice" id="dial-submit">Submit</button></div>';
  addRedSkip(taskComplete);
  let value=0;
  const display=screen.querySelector('#dial-value');
  screen.querySelector('#dial-plus').addEventListener('click',()=>{
    value=(value+1)%1000;
    display.textContent=String(value).padStart(3,'0');
  });
  screen.querySelector('#dial-submit').addEventListener('click',()=>{
    if (display.textContent===localStorage.getItem('task-passcode')) {
      taskComplete();
    } else {
      show({title:'Incorrect passcode.',text:'Returning to the start.'});
      waitTimer=setTimeout(start,2200);
    }
  });
}
function greenStart() {
  currentMode='RELAXED';
  greenStagesSinceCheckIn=0;
  document.body.className='mode-green';
  show({title:'You have activated RELAXED MODE. Enjoy the journey. Press continue to proceed.',choices:[{label:'Continue',action:()=>bandstand(1)}],skipTo:()=>bandstand(1)});
}
function advanceGreenStage(next) {
  if(currentMode!=='RELAXED') {
    next();
    return;
  }
  greenStagesSinceCheckIn++;
  if(greenStagesSinceCheckIn%2===0) {
    show({title:'Do you want to remain in RELAXED MODE?',choices:[
      {label:'Yes',action:next},
      {label:'No',action:start}
    ],skipTo:next});
  } else next();
}
function bandstand(step) {
  if(step===1) show({title:'Walk once around the building.',text:'Press Proceed when you have completed one circuit.',choices:[{label:'Proceed',action:()=>bandstand(2)}],skipTo:()=>bandstand(2)});
  else if(step===2) show({title:'We hope you enjoyed your walk.',text:'Return to the task room.',choices:[{label:'Proceed',action:relaxedContinue}],skipTo:relaxedContinue});
}
function relaxedContinue() { show({title:'Do you want to continue in RELAXED MODE?',choices:[{label:'Yes',action:musicWait},{label:'No',action:start}],skipTo:musicWait}); }
function skipMusicStage() {
  if(currentAudio) {
    currentAudio.pause();
    currentAudio=null;
  }
  advanceGreenStage(mindfulnessGame);
}
function musicWait() {
  if (skipMusicForTesting) {
    show({title:'Sit back and enjoy some music.',choices:[{label:'Continue',action:()=>advanceGreenStage(mindfulnessGame)}],skipTo:skipMusicStage});
    return;
  }
  show({title:'Sit back and enjoy some music.',skipTo:skipMusicStage});
  const audio=new Audio('./music.mp3');
  currentAudio=audio;
  const showPlaybackChoices=()=>{
    if (currentAudio!==audio) return;
    show({title:'Sit back and enjoy some music.',choices:[
      {label:'Continue',action:()=>advanceGreenStage(mindfulnessGame)},
      {label:'Listen again',action:musicWait}
    ],skipTo:skipMusicStage});
  };
  audio.addEventListener('ended',showPlaybackChoices,{once:true});
  audio.play().catch(()=>{
    if (currentAudio===audio) show({title:'Sit back and enjoy some music.',text:'The audio could not be played. Please try again.',choices:[{label:'Listen again',action:musicWait}],skipTo:skipMusicStage});
  });
}
function mindfulnessGame() {
  clearTimeout(bubbleTimer);
  screen.classList.remove('rule-page','dial-page');
  screen.classList.add('mindfulness-game');
  screen.innerHTML='<h1>Enjoy some mindful time. Touch the circles when they appear.</h1><div class="bubble-stage" id="bubble-stage"><div class="bubble-counter" id="bubble-counter">0 / 30</div></div>';
  addGreenSkip(()=>advanceGreenStage(reflectionIntro));
  const stage=screen.querySelector('#bubble-stage');
  const counter=screen.querySelector('#bubble-counter');
  let popped=0;
  let spawned=0;
  function scheduleNextBubble() {
    const nextNumber=spawned+1;
    const delay=Math.max(500,4000-((nextNumber-1)/29)*3500);
    bubbleTimer=setTimeout(spawnBubble,delay);
  }
  function spawnBubble() {
    if (popped>=30) return;
    const bubble=document.createElement('button');
    bubble.className='mindful-bubble';
    bubble.type='button';
    bubble.setAttribute('aria-label','Pop circle');
    const diameter=54+Math.random()*52;
    bubble.style.width=`${diameter}px`;
    bubble.style.height=`${diameter}px`;
    bubble.style.left=`${14+Math.random()*72}%`;
    bubble.style.top=`${21+Math.random()*64}%`;
    bubble.addEventListener('click',()=>{
      if (bubble.classList.contains('burst')) return;
      playPopSound();
      bubble.classList.add('burst');
      popped++;
      counter.textContent=`${popped} / 30`;
      setTimeout(()=>bubble.remove(),220);
      if (popped===30) {
        clearTimeout(bubbleTimer);
        stage.querySelectorAll('.mindful-bubble').forEach(node=>node.remove());
        show({title:'Mindful time complete.',choices:[{label:'Continue',action:()=>advanceGreenStage(reflectionIntro)}]});
      }
    });
    stage.append(bubble);
    spawned++;
    setTimeout(()=>bubble.remove(),8500);
    scheduleNextBubble();
  }
  bubbleTimer=setTimeout(spawnBubble,4000);
}
const reflectionQuestions=[
  'Are you happy with how your life has turned out?',
  'Do you have many regrets?',
  'Would you change the past if you could?',
  'Are you fulfilled?',
  'Are you content with your place in the universe?'
];
function reflectionIntro() {
  show({title:'Reflect on your life up to now.',choices:[{label:'Continue',action:()=>showReflectionQuestion(0)}],skipTo:()=>showReflectionQuestion(0)});
}
function showReflectionQuestion(index) {
  if (index>=reflectionQuestions.length) {
    show({title:'Thank you for reflecting.',choices:[{label:'Continue',action:()=>advanceGreenStage(guidedBreathing)}],skipTo:()=>advanceGreenStage(guidedBreathing)});
    return;
  }
  show({title:reflectionQuestions[index],choices:[
    {label:'Yes',action:()=>showReflectionQuestion(index+1)},
    {label:'No',action:()=>showReflectionQuestion(index+1)}
  ],skipTo:()=>showReflectionQuestion(index+1)});
}
function guidedBreathing() {
  clearTimeout(breathingTimer);
  screen.classList.remove('rule-page','dial-page','mindfulness-game');
  screen.classList.add('breathing-screen');
  screen.innerHTML='<h1>Follow the circle. Breathe in as it expands and out as it contracts.</h1><div class="breathing-content"><p class="breathing-phase" id="breathing-phase">Breathe in</p><div class="breathing-orb" id="breathing-orb"></div><p class="breathing-count" id="breathing-count"></p></div>';
  addGreenSkip(()=>advanceGreenStage(storyPlaceholder));
  const phaseText=screen.querySelector('#breathing-phase');
  const countText=screen.querySelector('#breathing-count');
  const orb=screen.querySelector('#breathing-orb');
  let cycle=1;
  function breatheIn() {
    phaseText.textContent='Breathe in.';
    countText.textContent=`Cycle ${cycle} of 6`;
    orb.classList.remove('exhale');
    orb.classList.add('inhale');
    breathingTimer=setTimeout(breatheOut,4000);
  }
  function breatheOut() {
    phaseText.textContent='Breathe out.';
    orb.classList.remove('inhale');
    orb.classList.add('exhale');
    breathingTimer=setTimeout(()=>{
      cycle++;
      if (cycle>6) advanceGreenStage(storyPlaceholder);
      else breatheIn();
    },6000);
  }
  void orb.offsetWidth;
  breatheIn();
}
function storyPlaceholder() {
  show({title:'Little Fred and the Very Patient Pebble',text:'Settle in and listen.',skipTo:()=>advanceGreenStage(associationIntro)});
  const audio=document.createElement('audio');
  audio.controls=false;
  audio.preload='metadata';
  audio.src='./Little%20Fred%20and%20the%20Pebble.m4a';
  screen.querySelector('#choices').before(audio);
  currentAudio=audio;
  const playStory=()=>audio.play().catch(()=>{
    if(currentAudio!==audio) return;
    show({title:'Little Fred and the Very Patient Pebble',text:'Tap below to begin the story.',choices:[
      {label:'Begin story',action:storyPlaceholder}
    ],skipTo:()=>advanceGreenStage(associationIntro)});
  });
  audio.addEventListener('ended',()=>{
    if(currentAudio!==audio) return;
    show({title:'The Very Patient Pebble',text:'The story is complete.',choices:[
      {label:'Listen again',action:storyPlaceholder},
      {label:'Continue',action:()=>advanceGreenStage(associationIntro)}
    ],skipTo:()=>advanceGreenStage(associationIntro)});
  },{once:true});
  playStory();
}
const associationRounds=[
  {word:'STILLNESS',choices:['Peace','Waiting','A pebble']},
  {word:'TIME',choices:['A clock','A gentle river','One minute']},
  {word:'PEBBLE',choices:['Smooth','Small','Gerald']},
  {word:'RELAXATION',choices:['Breathing','Soft music','Administrative approval']},
  {word:'JOURNEY',choices:['A path','A destination','Are we there yet?']}
];
function associationIntro() {
  show({title:'Let’s play word association.',text:'Choose the first word that comes to mind. There are no wrong answers.',choices:[{label:'Continue',action:()=>showAssociationRound(0)}],skipTo:()=>showAssociationRound(0)});
}
function showAssociationRound(index) {
  if(index>=associationRounds.length) {
    show({title:'Thank you for associating those words.',choices:[{label:'Continue',action:()=>advanceGreenStage(drawingIntro)}],skipTo:()=>advanceGreenStage(drawingIntro)});
    return;
  }
  const round=associationRounds[index];
  show({title:`What word comes to mind when you think of ${round.word}?`,choices:round.choices.map(word=>({label:word,action:()=>showAssociationRound(index+1)})),skipTo:()=>showAssociationRound(index+1)});
}
function relaxationProgress() {
  stopHumPitch();
  clearTimeout(progressTimer);
  screen.classList.remove('rule-page','dial-page','mindfulness-game','breathing-screen');
  screen.classList.add('relaxation-progress');
  screen.innerHTML='<h1>Your relaxation is being carefully measured.</h1><div class="relaxation-meter"><div class="progress-track" role="progressbar" aria-label="Relaxation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill" id="progress-fill"></div></div><p id="progress-label">0%</p></div><p class="progress-status" id="progress-status">Please remain relaxed.</p><div class="buttons progress-actions" id="progress-actions"></div>';
  addGreenSkip(()=>advanceGreenStage(finishPrompt));
  const fill=screen.querySelector('#progress-fill');
  const track=screen.querySelector('.progress-track');
  const label=screen.querySelector('#progress-label');
  const status=screen.querySelector('#progress-status');
  const actions=screen.querySelector('#progress-actions');
  const started=performance.now();
  let displayed=0;
  function tick() {
    const elapsed=performance.now()-started;
    if(elapsed>=60000) {
      fill.style.width='100%';
      track.setAttribute('aria-valuenow','100');
      label.textContent='100%';
      status.textContent='Relaxation measurement complete.';
      const button=document.createElement('button');
      button.className='choice';
      button.textContent='Continue';
      button.addEventListener('click',()=>advanceGreenStage(finishPrompt));
      actions.append(button);
      progressTimer=null;
      return;
    }
    if(elapsed>=40000) {
      displayed=95;
    } else {
      const steady=(elapsed/40000)*95;
      displayed=Math.max(0,Math.min(95,Math.random()<0.16 ? displayed-(0.8+Math.random()*2.5) : steady+(Math.random()*3-1.5)));
    }
    fill.style.width=`${displayed}%`;
    track.setAttribute('aria-valuenow',String(Math.round(displayed)));
    label.textContent=`${Math.round(displayed)}%`;
    progressTimer=setTimeout(tick,700);
  }
  progressTimer=setTimeout(tick,700);
}
function drawingIntro() {
  show({title:'Draw a picture that represents how you are feeling.',choices:[{label:'Begin drawing',action:startDrawing}],skipTo:startDrawing});
}
function startDrawing() {
  const requiredDistance=7200;
  drawingDistance=0;
  screen.classList.remove('rule-page','dial-page','mindfulness-game','breathing-screen','relaxation-progress');
  screen.classList.add('drawing-screen');
  screen.innerHTML='<h1>Draw a picture that represents how you are feeling.</h1><canvas class="drawing-canvas" aria-label="Drawing area"></canvas><p class="drawing-status">Keep drawing.</p><div class="buttons drawing-actions"></div>';
  addGreenSkip(()=>advanceGreenStage(starFollow));
  const canvas=screen.querySelector('.drawing-canvas');
  const context=canvas.getContext('2d');
  const status=screen.querySelector('.drawing-status');
  const actions=screen.querySelector('.drawing-actions');
  let drawing=false;
  let previous=null;
  function resizeCanvas() {
    const bounds=canvas.getBoundingClientRect();
    const ratio=window.devicePixelRatio||1;
    const image=context.getImageData(0,0,canvas.width,canvas.height);
    canvas.width=Math.round(bounds.width*ratio);
    canvas.height=Math.round(bounds.height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    context.lineWidth=5;
    context.lineCap='round';
    context.lineJoin='round';
    context.strokeStyle='#fff';
    if(image.width&&image.height) context.putImageData(image,0,0);
  }
  resizeCanvas();
  window.addEventListener('resize',resizeCanvas,{once:true});
  canvas.addEventListener('pointerdown',event=>{
    event.preventDefault();
    drawing=true;
    previous={x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    const bounds=canvas.getBoundingClientRect();
    context.moveTo(previous.x-bounds.left,previous.y-bounds.top);
    context.lineTo(previous.x-bounds.left+0.1,previous.y-bounds.top+0.1);
    context.stroke();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drawing||!previous) return;
    event.preventDefault();
    const bounds=canvas.getBoundingClientRect();
    const points=event.getCoalescedEvents?event.getCoalescedEvents():[event];
    for(const point of points) {
      const dx=point.clientX-previous.x;
      const dy=point.clientY-previous.y;
      drawingDistance+=Math.hypot(dx,dy);
      context.lineTo(point.clientX-bounds.left,point.clientY-bounds.top);
      previous={x:point.clientX,y:point.clientY};
    }
    context.stroke();
    if(drawingDistance>=requiredDistance&&!actions.hasChildNodes()) {
      status.textContent='Lovely drawing. Proceed?';
      const button=document.createElement('button');
      button.className='choice';
      button.textContent='Continue';
      button.addEventListener('click',()=>advanceGreenStage(starFollow));
      actions.append(button);
    }
  });
  const stopDrawing=()=>{drawing=false;previous=null;};
  canvas.addEventListener('pointerup',stopDrawing);
  canvas.addEventListener('pointercancel',stopDrawing);
}
function finishPrompt() {
  show({title:'Press to finish task.',choices:[{label:'Press to finish task',action:taskComplete}],skipTo:taskComplete});
}
function starFollow() {
  screen.classList.remove('rule-page','dial-page','mindfulness-game','breathing-screen','relaxation-progress','drawing-screen');
  screen.classList.add('star-follow-screen');
  screen.innerHTML='<h1>Keep your eyes focused on the star as it moves.</h1><div class="twinkling-star" aria-hidden="true">✦</div><div class="buttons star-follow-actions"></div>';
  const continueToTone=()=>{
    cancelAnimationFrame(starAnimationFrame);
    starAnimationFrame=null;
    advanceGreenStage(humPitch);
  };
  addGreenSkip(continueToTone);
  const star=screen.querySelector('.twinkling-star');
  const actions=screen.querySelector('.star-follow-actions');
  const bounds=screen.getBoundingClientRect();
  const margin=58;
  const width=Math.max(1,bounds.width-margin*2);
  const height=Math.max(1,bounds.height-190);
  const current={x:bounds.width/2,y:bounds.height/2};
  let tangent={x:1,y:0};
  let segment=null;
  const started=performance.now();
  const randomPosition=()=>({
    x:margin+Math.random()*width,
    y:Math.min(bounds.height-70,110+Math.random()*height)
  });
  const clampPoint=point=>({
    x:Math.max(margin,Math.min(bounds.width-margin,point.x)),
    y:Math.max(100,Math.min(bounds.height-65,point.y))
  });
  function makeSegment(timestamp) {
    const end=randomPosition();
    const dx=end.x-current.x;
    const dy=end.y-current.y;
    const distance=Math.max(1,Math.hypot(dx,dy));
    const direction={x:dx/distance,y:dy/distance};
    const perpendicular={x:-direction.y,y:direction.x};
    const startHandle=distance*(0.22+Math.random()*0.2);
    const endHandle=distance*(0.22+Math.random()*0.2);
    const curve=(Math.random()-0.5)*distance*0.55;
    const control1=clampPoint({x:current.x+tangent.x*startHandle+perpendicular.x*curve,y:current.y+tangent.y*startHandle+perpendicular.y*curve});
    const control2=clampPoint({x:end.x-direction.x*endHandle+perpendicular.x*curve,y:end.y-direction.y*endHandle+perpendicular.y*curve});
    const speed=85+Math.random()*190;
    segment={start:{...current},control1,control2,end,duration:Math.max(650,Math.min(3200,distance/speed*1000)),startedAt:timestamp};
  }
  function moveStar(timestamp) {
    if(timestamp-started>=60000) {
      starAnimationFrame=null;
      star.classList.add('star-stopped');
      const button=document.createElement('button');
      button.className='choice';
      button.textContent='Proceed';
      button.addEventListener('click',continueToTone);
      actions.append(button);
      return;
    }
    if(!segment||timestamp-segment.startedAt>=segment.duration) {
      if(segment) {
        current.x=segment.end.x;
        current.y=segment.end.y;
        const exitX=segment.end.x-segment.control2.x;
        const exitY=segment.end.y-segment.control2.y;
        const magnitude=Math.hypot(exitX,exitY)||1;
        tangent={x:exitX/magnitude,y:exitY/magnitude};
      }
      makeSegment(timestamp);
    }
    const progress=Math.min(1,(timestamp-segment.startedAt)/segment.duration);
    const inverse=1-progress;
    const x=inverse**3*segment.start.x+3*inverse**2*progress*segment.control1.x+3*inverse*progress**2*segment.control2.x+progress**3*segment.end.x;
    const y=inverse**3*segment.start.y+3*inverse**2*progress*segment.control1.y+3*inverse*progress**2*segment.control2.y+progress**3*segment.end.y;
    star.style.left=`${x}px`;
    star.style.top=`${y}px`;
    starAnimationFrame=requestAnimationFrame(moveStar);
  }
  starAnimationFrame=requestAnimationFrame(moveStar);
}
function stopHumPitch() {
  clearInterval(humPitchInterval);
  clearTimeout(humPitchEndTimer);
  clearTimeout(humMessageTimer);
  humPitchInterval=null;
  humPitchEndTimer=null;
  humMessageTimer=null;
  if(humOscillator) {
    try { humOscillator.stop(); } catch {}
    humOscillator.disconnect();
    humOscillator=null;
  }
  if(humGain) {
    humGain.disconnect();
    humGain=null;
  }
}
function humPitch() {
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass) {
    show({title:'Your browser cannot play the tone.',choices:[{label:'Continue',action:()=>advanceGreenStage(relaxationProgress)}],skipTo:()=>advanceGreenStage(relaxationProgress)});
    return;
  }
  screen.classList.remove('rule-page','dial-page','mindfulness-game','breathing-screen','relaxation-progress','drawing-screen','star-follow-screen');
  screen.classList.add('hum-pitch-screen');
  screen.innerHTML='<h1>Hum along at the same pitch as the tone.</h1><p class="hum-status">Listen carefully.</p><div class="buttons hum-actions"></div>';
  addGreenSkip(()=>advanceGreenStage(relaxationProgress));
  humAudioContext ||= new AudioContextClass();
  humAudioContext.resume();
  humOscillator=humAudioContext.createOscillator();
  humGain=humAudioContext.createGain();
  humOscillator.type='sine';
  const baseFrequency=220;
  const started=performance.now();
  let pitch=1.4;
  const frequencyAt=semitones=>baseFrequency*Math.pow(2,semitones/12);
  humOscillator.frequency.setValueAtTime(frequencyAt(pitch),humAudioContext.currentTime);
  humGain.gain.setValueAtTime(0,humAudioContext.currentTime);
  humGain.gain.linearRampToValueAtTime(0.12,humAudioContext.currentTime+0.25);
  humOscillator.connect(humGain).connect(humAudioContext.destination);
  humOscillator.start();
  const status=screen.querySelector('.hum-status');
  const actions=screen.querySelector('.hum-actions');
  humMessageTimer=setTimeout(()=>{status.textContent='Not quite...';},20000);
  humPitchInterval=setInterval(()=>{
    const movement=(Math.random()-0.5)*0.9;
    pitch=Math.max(0,Math.min(4,pitch+movement));
    const microtonalAdjustment=(Math.random()*0.24)-0.12;
    const adjustedPitch=Math.max(0,Math.min(4,pitch+microtonalAdjustment));
    const now=humAudioContext.currentTime;
    humOscillator.frequency.cancelScheduledValues(now);
    humOscillator.frequency.setTargetAtTime(frequencyAt(adjustedPitch),now,0.45);
  },1250);
  humPitchEndTimer=setTimeout(()=>{
    const now=humAudioContext.currentTime;
    humGain.gain.cancelScheduledValues(now);
    humGain.gain.setTargetAtTime(0,now,0.12);
    clearInterval(humPitchInterval);
    humPitchInterval=null;
    humPitchEndTimer=setTimeout(()=>{
      stopHumPitch();
      status.textContent='';
      const button=document.createElement('button');
      button.className='choice';
      button.textContent='Proceed';
      button.addEventListener('click',()=>advanceGreenStage(relaxationProgress));
      actions.append(button);
    },350);
  },Math.max(0,40000-(performance.now()-started)));
}

async function prepareOfflineApp() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    start();
    return;
  }

  show({title:'Preparing the app…',text:'Downloading the files needed to use it offline.'});
  screen.insertAdjacentHTML('beforeend', '<div class="startup-progress"><div class="startup-progress-track" role="progressbar" aria-label="Preparing offline files" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0"><div class="startup-progress-fill"></div></div><p class="startup-progress-label" aria-live="polite">Starting download…</p></div>');
  const progress = screen.querySelector('.startup-progress-track');
  const label = screen.querySelector('.startup-progress-label');
  const fill = screen.querySelector('.startup-progress-fill');
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type !== 'offline-cache-progress' || !progress.isConnected) return;
    const {completed, total, file} = event.data;
    progress.setAttribute('aria-valuemax', total);
    progress.setAttribute('aria-valuenow', completed);
    fill.style.width = `${Math.round(completed / total * 100)}%`;
    label.textContent = completed === total ? 'Ready to start.' : `Downloading ${file} (${completed} of ${total})`;
  });
  try {
    await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.warn('Offline preparation failed; starting the app online.', error);
    label.textContent = 'Could not prepare offline files. Starting the app…';
  }
  start();
}

prepareOfflineApp();
