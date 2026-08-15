/* ============================================================
   EOL Solitaire - shared engine
   Used by FreeCell, Spider, Pyramid, TriPeaks.
   Reuses the card face art from the Klondike (Solitaire JS) package.
   ============================================================ */

var SolEngine = (function () {

    var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    var RANK_LABEL = { A: 'A', T: '10', J: 'J', Q: 'Q', K: 'K' };
    var SUITS = ['H', 'D', 'C', 'S'];
    var RED_SUITS = { H: true, D: true };

    function rankValue(rank) {
        return RANKS.indexOf(rank) + 1;
    }

    function isRed(suit) {
        return !!RED_SUITS[suit];
    }

    function makeDeck() {
        var deck = [];
        for (var s = 0; s < SUITS.length; s++) {
            for (var r = 0; r < RANKS.length; r++) {
                deck.push({ rank: RANKS[r], suit: SUITS[s], faceUp: false, el: null });
            }
        }
        return deck;
    }

    function makeDoubleDeck() {
        return makeDeck().concat(makeDeck());
    }

    function shuffle(deck) {
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = deck[i];
            deck[i] = deck[j];
            deck[j] = tmp;
        }
        return deck;
    }

    function cardImage(card) {
        return card.faceUp
            ? '../shared/cards/' + card.rank + card.suit + '.png'
            : '../shared/cards/back.png';
    }

    // Creates the DOM element for a card (once) and keeps it updated.
    function renderCard(card) {
        if (!card.el) {
            var el = document.createElement('div');
            el.className = 'sol-card';
            el.dataset.rank = card.rank;
            el.dataset.suit = card.suit;
            card.el = el;
        }
        card.el.style.backgroundImage = 'url(' + cardImage(card) + ')';
        card.el.classList.toggle('sol-red', card.faceUp && isRed(card.suit));
        card.el.classList.toggle('sol-face-down', !card.faceUp);
        return card.el;
    }

    /* ---------- drag and drop (pointer events: mouse + touch) ---------- */

    var dragState = null;

    function makeDraggable(cardEls, opts) {
        // cardEls: array of card DOM elements being dragged together (a stack)
        // opts: { onDrop(targetPileEl), onCancel() }
        var first = cardEls[0];
        first.addEventListener('pointerdown', function (e) {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            startDrag(cardEls, e, opts);
        });
    }

    function startDrag(cardEls, e, opts) {
        var rects = cardEls.map(function (el) { return el.getBoundingClientRect(); });
        var originRect = rects[0];
        var offsetX = e.clientX - originRect.left;
        var offsetY = e.clientY - originRect.top;

        cardEls.forEach(function (el, i) {
            el.classList.add('sol-dragging');
            el.style.zIndex = 5000 + i;
            el.style.position = 'fixed';
            el.style.left = rects[i].left + 'px';
            el.style.top = rects[i].top + 'px';
            el.style.pointerEvents = 'none';
        });

        dragState = { cardEls: cardEls, offsetX: offsetX, offsetY: offsetY, opts: opts, moved: false };

        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragEnd);
    }

    function onDragMove(e) {
        if (!dragState) return;
        dragState.moved = true;
        var baseLeft = e.clientX - dragState.offsetX;
        var baseTop = e.clientY - dragState.offsetY;
        dragState.cardEls.forEach(function (el, i) {
            el.style.left = baseLeft + 'px';
            el.style.top = (baseTop + i * 26) + 'px';
        });
    }

    function onDragEnd(e) {
        if (!dragState) return;
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onDragEnd);

        var cardEls = dragState.cardEls;
        cardEls.forEach(function (el) { el.style.pointerEvents = ''; });

        // find drop target: hide dragged cards from hit-test, then elementFromPoint
        cardEls.forEach(function (el) { el.style.visibility = 'hidden'; });
        var target = document.elementFromPoint(e.clientX, e.clientY);
        cardEls.forEach(function (el) { el.style.visibility = ''; });

        var pileEl = target ? target.closest('[data-pile]') : null;
        var opts = dragState.opts;

        cardEls.forEach(function (el) {
            el.classList.remove('sol-dragging');
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.zIndex = '';
        });

        dragState = null;

        if (dragState !== null) return; // safety

        if (pileEl && opts.onDrop) {
            opts.onDrop(pileEl);
        } else if (opts.onCancel) {
            opts.onCancel();
        }
    }

    /* ---------- misc UI helpers ---------- */

    function fmtTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function startTimer(el) {
        var start = Date.now();
        var handle = setInterval(function () {
            el.textContent = fmtTime(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return {
            stop: function () { clearInterval(handle); },
            elapsed: function () { return Math.floor((Date.now() - start) / 1000); }
        };
    }

    function showWinBanner(container, message) {
        var banner = document.createElement('div');
        banner.className = 'sol-win-banner';
        banner.innerHTML = '<div class="sol-win-box">' +
            '<div class="sol-win-title">' + message + '</div>' +
            '<button class="sol-win-again">Play Again</button>' +
            '</div>';
        container.appendChild(banner);
        banner.querySelector('.sol-win-again').addEventListener('click', function () {
            location.reload();
        });
    }

    return {
        RANKS: RANKS,
        RANK_LABEL: RANK_LABEL,
        SUITS: SUITS,
        rankValue: rankValue,
        isRed: isRed,
        makeDeck: makeDeck,
        makeDoubleDeck: makeDoubleDeck,
        shuffle: shuffle,
        renderCard: renderCard,
        makeDraggable: makeDraggable,
        fmtTime: fmtTime,
        startTimer: startTimer,
        showWinBanner: showWinBanner
    };
})();
