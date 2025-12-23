const CODON_TABLE = {
  'TTT':'Phe','TTC':'Phe','TTA':'Leu','TTG':'Leu',
  'TCT':'Ser','TCC':'Ser','TCA':'Ser','TCG':'Ser',
  'TAT':'Tyr','TAC':'Tyr','TAA':'STOP','TAG':'STOP',
  'TGT':'Cys','TGC':'Cys','TGA':'STOP','TGG':'Trp',
  'CTT':'Leu','CTC':'Leu','CTA':'Leu','CTG':'Leu',
  'CCT':'Pro','CCC':'Pro','CCA':'Pro','CCG':'Pro',
  'CAT':'His','CAC':'His','CAA':'Gln','CAG':'Gln',
  'CGT':'Arg','CGC':'Arg','CGA':'Arg','CGG':'Arg',
  'ATT':'Ile','ATC':'Ile','ATA':'Ile','ATG':'Met',
  'ACT':'Thr','ACC':'Thr','ACA':'Thr','ACG':'Thr',
  'AAT':'Asn','AAC':'Asn','AAA':'Lys','AAG':'Lys',
  'AGT':'Ser','AGC':'Ser','AGA':'Arg','AGG':'Arg',
  'GTT':'Val','GTC':'Val','GTA':'Val','GTG':'Val',
  'GCT':'Ala','GCC':'Ala','GCA':'Ala','GCG':'Ala',
  'GAT':'Asp','GAC':'Asp','GAA':'Glu','GAG':'Glu',
  'GGT':'Gly','GGC':'Gly','GGA':'Gly','GGG':'Gly'
};

const AA_PROPERTIES = {
  'Phe':'Nonpolar','Leu':'Nonpolar','Ile':'Nonpolar','Met':'Nonpolar','Val':'Nonpolar',
  'Ala':'Nonpolar','Gly':'Nonpolar','Pro':'Nonpolar','Trp':'Nonpolar',
  'Ser':'Polar','Thr':'Polar','Cys':'Polar','Tyr':'Polar','Asn':'Polar','Gln':'Polar',
  'Asp':'Negative','Glu':'Negative','Lys':'Positive','Arg':'Positive','His':'Positive',
  'STOP':'Termination'
};

function getAminoAcid(codon){ return CODON_TABLE[codon]||'Unknown'; }
function getAminoAcidProperty(aa){ return AA_PROPERTIES[aa]||'Unknown'; }
function calculateGC(seq){ 
  if(!seq) return 0;
  let count = (seq.match(/[GC]/gi)||[]).length;
  return ((count/seq.length)*100).toFixed(2);
}
function parseSequence(seq){ return seq.toUpperCase().replace(/[^ATCG]/g,''); }

function analyzeMutation(sequence, position, newBase){
  const seq = parseSequence(sequence);
  const pos = parseInt(position)-1;
  const originalBase = seq[pos];
  const codonStart = Math.floor(pos/3)*3;
  const originalCodon = seq.substring(codonStart, codonStart+3);
  const mutatedSeq = seq.substring(0,pos)+newBase+seq.substring(pos+1);
  const mutatedCodon = mutatedSeq.substring(codonStart, codonStart+3);
  const originalAA = getAminoAcid(originalCodon);
  const mutatedAA = getAminoAcid(mutatedCodon);
  const originalProp = getAminoAcidProperty(originalAA);
  const mutatedProp = getAminoAcidProperty(mutatedAA);

  let mutationType='Unknown', explanation='', conservative='N/A';

  if(originalAA===mutatedAA){
    mutationType='Silent';
    explanation='No change in amino acid';
    conservative='Conservative';
  } else if(originalAA==='STOP' && mutatedAA!=='STOP'){
    mutationType='Readthrough';
    explanation='Stop codon mutated into coding codon';
    conservative='Non-Conservative';
  } else if(mutatedAA==='STOP'){
    mutationType='Nonsense';
    explanation='Premature stop codon';
    conservative='Non-Conservative';
  } else {
    mutationType='Missense';
    conservative=(originalProp===mutatedProp)?'Conservative':'Non-Conservative';
    explanation=(originalProp===mutatedProp)?`Amino acid changed but properties similar`:`Properties differ; may alter protein`;
  }

  return {
    mutationPosition: position,
    originalBase,
    newBase,
    originalCodon,
    mutatedCodon,
    originalAA,
    mutatedAA,
    mutationType,
    conservative,
    gcBefore: calculateGC(seq),
    gcAfter: calculateGC(mutatedSeq),
    explanation
  };
}

// UI Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const sequenceInput = document.getElementById('sequence');
const positionInput = document.getElementById('position');
const newBaseInput = document.getElementById('newBase');
const resultDiv = document.getElementById('result');
const historyTable = document.querySelector('#historyTable tbody');

// FASTA upload
document.getElementById('fastaUpload').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = function(evt){
      const content = evt.target.result.split('\n').filter(line=>!line.startsWith('>')).join('');
      sequenceInput.value = content.toUpperCase();
    }
    reader.readAsText(file);
  }
});

// History functions
function addToHistory(data){
  const row = document.createElement('tr');
  const time = new Date().toLocaleTimeString();
  row.innerHTML = `<td>${time}</td>
                   <td>#${data.mutationPosition}</td>
                   <td>${data.originalBase} → ${data.newBase}</td>
                   <td><span class="type-badge type-${data.mutationType}">${data.mutationType}</span></td>
                   <td>${data.explanation}</td>`;
  historyTable.prepend(row);

  let hist = JSON.parse(localStorage.getItem('mutationHistory')||'[]');
  hist.unshift({...data, time});
  localStorage.setItem('mutationHistory', JSON.stringify(hist));
}

function loadHistory(){
  let hist = JSON.parse(localStorage.getItem('mutationHistory')||'[]');
  hist.forEach(addToHistory);
}

// Clear history
document.getElementById('clearHistory').addEventListener('click', ()=>{
  localStorage.removeItem('mutationHistory');
  historyTable.innerHTML = '';
});

// Analyze button
analyzeBtn.addEventListener('click', ()=>{
  const seq = sequenceInput.value;
  const pos = positionInput.value;
  const newBase = newBaseInput.value.toUpperCase();
  if(!seq || !pos || !newBase.match(/[ATCG]/i)){
    alert('Enter valid sequence, position, and base');
    return;
  }
  const result = analyzeMutation(seq,pos,newBase);
  
  resultDiv.innerHTML = `
    <div class="report-card"><i class="icon-position">📄</i><strong>Pos ${result.mutationPosition}</strong><br>Nucleotide Index</div>
    <div class="report-card"><i class="icon-base">🔄</i><strong>${result.originalBase} → ${result.newBase}</strong><br>Nucleotide Substitution</div>
    <div class="report-card"><i class="icon-codon">🧬</i><strong>${result.originalCodon} → ${result.mutatedCodon}</strong><br>Triplet Sequence</div>
    <div class="report-card"><i class="icon-aa">⚡</i><strong>${result.originalAA} → ${result.mutatedAA}</strong><br>Translation Result</div>
    <div class="report-card"><i class="icon-type">⚠️</i><strong>${result.mutationType}</strong><br>Functional Classification</div>
    <div class="report-card"><i class="icon-conservation">⚖️</i><strong>${result.conservative}</strong><br>Chemical Properties</div>
    <div class="report-card"><i class="icon-gc">🧪</i><strong>${result.gcBefore}% → ${result.gcAfter}%</strong><br>Stability Indicator</div>
    <div class="report-card"><i class="icon-explanation">💡</i>${result.explanation}</div>
  `;
  
  addToHistory(result);
});

window.onload = loadHistory;
