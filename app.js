const screen = document.querySelector('#screen');
let currentMode = 'UNDECIDED';
let waitTimer;
let currentAudio=null;
let bubbleTimer=null;
let popAudioContext=null;
const skipMusicForTesting=false;

function show({pretitle='', title='', text='', choices=[], input=false, waitMs=0}={}) {
  clearTimeout(waitTimer);
  clearTimeout(bubbleTimer);
  bubbleTimer=null;
  screen.classList.remove('dial-page','mindfulness-game');
  if (currentAudio) {
    currentAudio.pause();
    currentAudio=null;
  }
  screen.classList.remove('dial-page');
  screen.classList.toggle('rule-page', Boolean(pretitle));
  screen.innerHTML = `${pretitle ? `<p class="pretitle">${pretitle}</p>` : ''}${title ? `<h1>${title}</h1>` : ''}${text ? `<p class="copy">${text}</p>` : ''}${input ? '<form id="number-form"><input id="number" type="text" inputmode="numeric" pattern="[0-9]{3}" maxlength="3" minlength="3" aria-label="Enter a three digit passcode" autocomplete="off" required><div class="buttons"><button class="choice" type="submit">Enter number</button></div></form>' : ''}<div class="buttons" id="choices"></div>`;
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
  if (input) {
    const numberInput=screen.querySelector('#number');
    numberInput.addEventListener('input',()=>numberInput.setCustomValidity(''));
    screen.querySelector('#number-form').addEventListener('submit', e => {
    e.preventDefault();
    const number = numberInput.value;
    if (!/^\d{3}$/.test(number) || number==='000') {
      numberInput.setCustomValidity(number==='000' ? '000 cannot be used as a passcode.' : 'Enter exactly three digits.');
      numberInput.reportValidity();
      return;
    }
    localStorage.setItem('task-passcode', number);
    show({title:'Passcode saved.',text:'Remember your passcode.',choices:[{label:'Continue',action:startPasscodeQuiz}]});
    });
  }
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
  show({pretitle:'You have activated INTELLECTUAL MODE.',title:'One simple rule:',text:'From this point forward, always answer the last question, not the current one.',choices:[{label:'Continue',action:understand}]});
}
function understand() { show({title:'Do you understand?',choices:[{label:'Continue',action:hardPrompt}]}); }
function hardPrompt() { show({title:'Do you want to activate challenging mode?',choices:[{label:'Yes',action:completePrompt},{label:'No',action:blueStart}]}); }
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
  document.body.className='mode-red';
  show({title:'You have activated CHALLENGING MODE.',text:'Enter the 3 digit passcode to continue.',input:true,choices:[{label:'Back to start',action:start}]});
}
const passcodeQuestions = [
  {text:'Is your passcode a prime number?', test:n => isPrime(n)},
  {text:'Is your passcode a square number?', test:n => Number.isInteger(Math.sqrt(n))},
  {text:'Is your passcode an even number?', test:n => n % 2 === 0},
  {text:'Does your passcode have three repeated digits?', test:digits => Object.values([...digits].reduce((counts,digit) => { counts[digit]=(counts[digit]||0)+1; return counts; },{})).some(count => count >= 3)}
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
  show({title:question.text,choices:[{label:'Yes',action:()=>answerPasscodeQuestion(true)},{label:'No',action:()=>answerPasscodeQuestion(false)}]});
}
function answerPasscodeQuestion(answer) {
  const digits=localStorage.getItem('task-passcode') || '';
  const number=Number(digits);
  const expected=passcodeQuestions[passcodeQuestionIndex].test(passcodeQuestionIndex===3 ? digits : number);
  if (answer!==expected) {
    show({title:'That answer is incorrect.',text:'Please enter your passcode again.',choices:[{label:'Enter passcode',action:redStart}]});
    return;
  }
  passcodeQuestionIndex++;
  if (passcodeQuestionIndex<passcodeQuestions.length) askPasscodeQuestion();
  else show({title:'Mathematical capabilities demonstrated',choices:[{label:'Continue',action:timekeepingTest}]});
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
      show({title:'Test 2 of 36 complete. Would you like to continue testing, or try a different path?',choices:[{label:'Continue testing',action:passcodeDialScreen},{label:'Try a different path',action:start}]});
    } else {
      show({title:'Timekeeping test failed.',text:'Try again?',choices:[{label:'Try Again',action:timekeepingTest},{label:'Back to the Start',action:start}]});
    }
  };
  show({title:'Pass the timekeeping test. Press button A and button B exactly one minute apart.',choices:[
    {label:'A',action:()=>press('A')},{label:'B',action:()=>press('B')}
  ]});
}
function redPlaceholder() {
  show({title:'Placeholder screen.'});
}
function passcodeDialScreen() {
  clearTimeout(waitTimer);
  screen.classList.remove('rule-page');
  screen.classList.add('dial-page');
  screen.innerHTML='<h1>Enter your passcode to skip to the end.</h1><div class="dial-row"><span class="dial-value" id="dial-value">000</span><button class="choice plus-button" id="dial-plus" aria-label="Increase number by one">+</button></div><div class="buttons dial-submit"><button class="choice" id="dial-submit">Submit</button></div>';
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
  document.body.className='mode-green';
  show({title:'You have activated RELAXED MODE. Enjoy the journey. Press continue to proceed.',choices:[{label:'Continue',action:()=>bandstand(1)}]});
}
function bandstand(step) {
  if(step===1) show({title:'Walk once around the building.',text:'Press Proceed when you have completed one circuit.',choices:[{label:'Proceed',action:()=>bandstand(2)}]});
  else if(step===2) show({title:'We hope you enjoyed your walk.',text:'Return to the task room.',choices:[{label:'Proceed',action:relaxedContinue}]});
}
function relaxedContinue() { show({title:'Do you want to continue in RELAXED MODE?',choices:[{label:'Yes',action:musicWait},{label:'No',action:start}]}); }
function musicWait() {
  if (skipMusicForTesting) {
    show({title:'Sit back and enjoy some music.',choices:[{label:'Continue',action:mindfulnessGame}]});
    return;
  }
  show({title:'Sit back and enjoy some music.'});
  const audio=new Audio('./music.mp3');
  currentAudio=audio;
  const showPlaybackChoices=()=>{
    if (currentAudio!==audio) return;
    show({title:'Sit back and enjoy some music.',choices:[
      {label:'Continue',action:mindfulnessGame},
      {label:'Listen again',action:musicWait}
    ]});
  };
  audio.addEventListener('ended',showPlaybackChoices,{once:true});
  audio.play().catch(()=>{
    if (currentAudio===audio) show({title:'Sit back and enjoy some music.',text:'The audio could not be played. Please try again.',choices:[{label:'Listen again',action:musicWait}]});
  });
}
function mindfulnessGame() {
  clearTimeout(bubbleTimer);
  screen.classList.remove('rule-page','dial-page');
  screen.classList.add('mindfulness-game');
  screen.innerHTML='<h1>Enjoy some mindful time. Touch the circles when they appear.</h1><div class="bubble-stage" id="bubble-stage"><div class="bubble-counter" id="bubble-counter">0 / 30</div></div>';
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
        show({title:'Mindful time complete.',choices:[{label:'Continue',action:reflectionIntro}]});
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
  show({title:'Reflect on your life up to now.',choices:[{label:'Continue',action:()=>showReflectionQuestion(0)}]});
}
function showReflectionQuestion(index) {
  if (index>=reflectionQuestions.length) {
    show({title:'Thank you for reflecting.',choices:[{label:'Press to finish task',action:taskComplete}]});
    return;
  }
  show({title:reflectionQuestions[index],choices:[
    {label:'Yes',action:()=>showReflectionQuestion(index+1)},
    {label:'No',action:()=>showReflectionQuestion(index+1)}
  ]});
}

start();
