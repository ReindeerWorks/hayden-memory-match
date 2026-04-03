// main.js — Hayden's Memory Match
// Requires data/words.js loaded first (MATCH_WORDS global).

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────────
  var flipped    = [];   // up to 2 card elements currently face-up
  var matched    = 0;    // number of matched pairs
  var locked     = false;
  var attempts   = 0;
  var audioCtx   = null; // lazy AudioContext

  // ── Helpers ────────────────────────────────────────────────────────────────

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utt   = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.8;
    utt.pitch = 1.1;
    window.speechSynthesis.speak(utt);
  }

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playChime() {
    try {
      var ctx   = getAudioCtx();
      var notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type            = "sine";
        osc.frequency.value = freq;
        var t0 = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.28, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        osc.start(t0);
        osc.stop(t0 + 0.5);
      });
    } catch (e) { /* AudioContext blocked — silent fail */ }
  }

  function playWinFanfare() {
    try {
      var ctx   = getAudioCtx();
      var notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 1046.5];
      notes.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type            = "sine";
        osc.frequency.value = freq;
        var t0 = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.3, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
        osc.start(t0);
        osc.stop(t0 + 0.6);
      });
    } catch (e) {}
  }

  // ── Confetti ────────────────────────────────────────────────────────────────

  function launchConfetti() {
    var container = document.getElementById("confetti-container");
    container.innerHTML = "";
    var colors = ["#7F77DD","#F472B6","#FFD166","#34D399","#60A5FA","#A78BFA","#FB923C"];
    var shapes = ["50%", "2px"];

    for (var i = 0; i < 70; i++) {
      var piece = document.createElement("div");
      piece.className = "confetti-piece";
      var size = (8 + Math.random() * 10) + "px";
      piece.style.left             = (Math.random() * 100) + "vw";
      piece.style.width            = size;
      piece.style.height           = size;
      piece.style.background       = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius     = shapes[Math.floor(Math.random() * shapes.length)];
      piece.style.animationDelay    = (Math.random() * 1.8) + "s";
      piece.style.animationDuration = (1.4 + Math.random() * 2) + "s";
      container.appendChild(piece);
    }
  }

  // ── Stars (top bar) ─────────────────────────────────────────────────────────

  function buildStars() {
    var row = document.getElementById("stars-row");
    row.innerHTML = "";
    for (var i = 0; i < MATCH_WORDS.length; i++) {
      var pip = document.createElement("span");
      pip.className = "star-pip";
      pip.setAttribute("aria-hidden", "true");
      pip.textContent = "⭐";
      row.appendChild(pip);
    }
  }

  function lightStar(index) {
    var pips = document.querySelectorAll(".star-pip");
    if (pips[index]) {
      pips[index].classList.add("lit");
    }
  }

  // ── Card element factory ────────────────────────────────────────────────────

  var SPARKLES = ["✦","✧","✦","⭐","✧","✦","✧","✦","✧"];

  function createCard(wordData) {
    var card = document.createElement("div");
    card.className  = "card";
    card.dataset.word = wordData.word;

    // Prevent double-tap zoom
    card.style.touchAction = "manipulation";

    // Inner wrapper (flips)
    var inner = document.createElement("div");
    inner.className = "card-inner";

    // ── Back face ──
    var back = document.createElement("div");
    back.className = "card-back";
    var pattern = document.createElement("div");
    pattern.className = "card-back-pattern";
    SPARKLES.forEach(function (sym) {
      var s = document.createElement("span");
      s.textContent = sym;
      pattern.appendChild(s);
    });
    back.appendChild(pattern);

    // ── Front face ──
    var front = document.createElement("div");
    front.className = "card-front";

    var img = document.createElement("img");
    img.src = wordData.image;
    img.alt = wordData.word;
    img.draggable = false;
    img.addEventListener("error", function () {
      var ph = document.createElement("div");
      ph.className   = "card-placeholder";
      ph.textContent = wordData.word[0].toUpperCase();
      img.parentNode && img.parentNode.replaceChild(ph, img);
    });

    var label = document.createElement("span");
    label.className   = "card-word";
    label.textContent = wordData.word;

    front.appendChild(img);
    front.appendChild(label);

    inner.appendChild(back);
    inner.appendChild(front);
    card.appendChild(inner);

    // ── Interaction ──
    card.addEventListener("click",      function () { handleFlip(card); });
    card.addEventListener("touchstart", function () { handleFlip(card); }, { passive: true });

    return card;
  }

  // ── Flip logic ──────────────────────────────────────────────────────────────

  function handleFlip(card) {
    if (locked)                           return;
    if (card.classList.contains("flipped")) return;
    if (card.classList.contains("matched")) return;
    if (flipped.length >= 2)              return;

    card.classList.add("flipped");
    flipped.push(card);

    if (flipped.length === 2) {
      attempts++;
      document.getElementById("attempts-count").textContent = attempts;
      locked = true;
      checkMatch();
    }
  }

  function checkMatch() {
    var a = flipped[0];
    var b = flipped[1];

    if (a.dataset.word === b.dataset.word) {
      // ── Match ──
      a.classList.add("matched");
      b.classList.add("matched");

      playChime();
      speak(a.dataset.word);
      lightStar(matched);
      matched++;

      flipped = [];
      locked  = false;

      if (matched === MATCH_WORDS.length) {
        setTimeout(showWin, 600);
      }
    } else {
      // ── No match — hold cards face-up so child can read both words,
      //    then shake and flip back ──
      setTimeout(function () {
        a.classList.add("shake");
        b.classList.add("shake");
      }, 2200);

      setTimeout(function () {
        a.classList.remove("flipped", "shake");
        b.classList.remove("flipped", "shake");
        flipped = [];
        locked  = false;
      }, 2600);
    }
  }

  // ── Win ─────────────────────────────────────────────────────────────────────

  function showWin() {
    playWinFanfare();
    speak("You found them all Hayden! Amazing!");
    launchConfetti();
    document.getElementById("win-screen").hidden = false;
  }

  // ── Build / Reset ────────────────────────────────────────────────────────────

  function buildGrid() {
    var container = document.getElementById("grid-container");
    container.innerHTML = "";

    // Duplicate each word to make pairs, then shuffle
    var deck = [];
    MATCH_WORDS.forEach(function (w) {
      deck.push(w);
      deck.push(w);
    });
    deck = shuffle(deck);

    deck.forEach(function (wordData) {
      container.appendChild(createCard(wordData));
    });
  }

  function resetGame() {
    flipped   = [];
    matched   = 0;
    locked    = false;
    attempts  = 0;
    document.getElementById("attempts-count").textContent = "0";
    document.getElementById("win-screen").hidden = true;
    document.getElementById("confetti-container").innerHTML = "";
    buildStars();
    buildGrid();
  }

  // ── Play Again button ────────────────────────────────────────────────────────

  document.getElementById("play-again-btn").addEventListener("click", resetGame);

  // ── Boot ─────────────────────────────────────────────────────────────────────

  buildStars();
  buildGrid();

}());
