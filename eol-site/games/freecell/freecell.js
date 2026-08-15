/* ============================================================
   EOL Cards - FreeCell
   ============================================================ */

(function () {
    var SUITS = SolEngine.SUITS;
    var isRed = SolEngine.isRed;
    var rankValue = SolEngine.rankValue;

    var tableau = [[], [], [], [], [], [], [], []]; // 8 columns
    var freecells = [null, null, null, null];
    var foundations = { H: [], D: [], C: [], S: [] };

    var moveCountEl = document.getElementById('moveCount');
    var timerEl = document.getElementById('timer');
    var moves = 0;
    var timer = null;

    function deal() {
        var deck = SolEngine.shuffle(SolEngine.makeDeck());
        deck.forEach(function (c) { c.faceUp = true; });
        var col = 0;
        while (deck.length) {
            tableau[col % 8].push(deck.pop());
            col++;
        }
    }

    function isSequenceFrom(colCards, startIndex) {
        // returns true if colCards[startIndex..end] is a valid descending
        // alternating-color sequence (a movable stack)
        for (var i = startIndex; i < colCards.length - 1; i++) {
            var a = colCards[i], b = colCards[i + 1];
            if (isRed(a.suit) === isRed(b.suit)) return false;
            if (rankValue(a.rank) !== rankValue(b.rank) + 1) return false;
        }
        return true;
    }

    function countEmptyFreecells() {
        return freecells.filter(function (c) { return c === null; }).length;
    }

    function countEmptyColumns(excludeIdx) {
        var n = 0;
        for (var i = 0; i < 8; i++) {
            if (i === excludeIdx) continue;
            if (tableau[i].length === 0) n++;
        }
        return n;
    }

    function maxMovable(targetColIsEmpty, excludeIdx) {
        var emptyCols = countEmptyColumns(excludeIdx);
        return (1 + countEmptyFreecells()) * Math.pow(2, emptyCols);
    }

    function canPlaceOnTableau(card, col) {
        if (col.length === 0) return true;
        var top = col[col.length - 1];
        return isRed(top.suit) !== isRed(card.suit) && rankValue(top.rank) === rankValue(card.rank) + 1;
    }

    function canPlaceOnFoundation(card, pile) {
        if (pile.length === 0) return card.rank === 'A';
        var top = pile[pile.length - 1];
        return top.suit === card.suit && rankValue(card.rank) === rankValue(top.rank) + 1;
    }

    function checkWin() {
        var total = 0;
        SUITS.forEach(function (s) { total += foundations[s].length; });
        if (total === 52) {
            timer.stop();
            SolEngine.showWinBanner(document.querySelector('.sol-table'),
                'You won FreeCell in ' + moves + ' moves!');
        }
    }

    function render() {
        // tableau columns
        for (var c = 0; c < 8; c++) {
            var colEl = document.getElementById('tab-' + c);
            colEl.innerHTML = '';
            var cards = tableau[c];
            colEl.style.height = (126 + Math.max(0, cards.length - 1) * 28) + 'px';
            cards.forEach(function (card, idx) {
                var el = SolEngine.renderCard(card);
                el.style.left = '0px';
                el.style.top = (idx * 28) + 'px';
                el.style.zIndex = idx;
                colEl.appendChild(el);
                attachDrag(card, c, idx);
            });
        }

        // free cells
        for (var f = 0; f < 4; f++) {
            var fEl = document.getElementById('free-' + f);
            fEl.innerHTML = '';
            var card = freecells[f];
            if (card) {
                var el = SolEngine.renderCard(card);
                el.style.left = '0px';
                el.style.top = '0px';
                fEl.appendChild(el);
                attachDragFreecell(card, f);
            }
        }

        // foundations
        SUITS.forEach(function (s, i) {
            var fdEl = document.getElementById('found-' + s);
            fdEl.innerHTML = '';
            var pile = foundations[s];
            if (pile.length) {
                var card = pile[pile.length - 1];
                var el = SolEngine.renderCard(card);
                el.style.left = '0px';
                el.style.top = '0px';
                fdEl.appendChild(el);
            }
        });

        moveCountEl.textContent = moves;
    }

    function attachDrag(card, colIndex, cardIndex) {
        var col = tableau[colIndex];
        var isMovableStack = isSequenceFrom(col, cardIndex);
        if (!isMovableStack) return; // only a valid tail sequence (incl. single card) can be dragged

        var stackCards = col.slice(cardIndex);
        var els = stackCards.map(function (c) { return c.el; });

        SolEngine.makeDraggable(els, {
            onDrop: function (pileEl) {
                handleDrop(stackCards, colIndex, cardIndex, pileEl);
            },
            onCancel: function () { render(); }
        });
    }

    function attachDragFreecell(card, freeIndex) {
        SolEngine.makeDraggable([card.el], {
            onDrop: function (pileEl) {
                handleDropFromFreecell(card, freeIndex, pileEl);
            },
            onCancel: function () { render(); }
        });
    }

    function handleDrop(stackCards, fromCol, fromIndex, pileEl) {
        var pileType = pileEl.dataset.pile;
        var moved = false;

        if (pileType.indexOf('tab-') === 0) {
            var destCol = parseInt(pileType.split('-')[1], 10);
            if (destCol === fromCol) { render(); return; }
            var limit = maxMovable(tableau[destCol].length === 0, fromCol);
            if (stackCards.length <= limit && canPlaceOnTableau(stackCards[0], tableau[destCol])) {
                tableau[fromCol].splice(fromIndex, stackCards.length);
                tableau[destCol] = tableau[destCol].concat(stackCards);
                moved = true;
            }
        } else if (pileType.indexOf('free-') === 0 && stackCards.length === 1) {
            var fi = parseInt(pileType.split('-')[1], 10);
            if (freecells[fi] === null) {
                tableau[fromCol].splice(fromIndex, 1);
                freecells[fi] = stackCards[0];
                moved = true;
            }
        } else if (pileType.indexOf('found-') === 0 && stackCards.length === 1) {
            var suit = pileType.split('-')[1];
            if (suit === stackCards[0].suit && canPlaceOnFoundation(stackCards[0], foundations[suit])) {
                tableau[fromCol].splice(fromIndex, 1);
                foundations[suit].push(stackCards[0]);
                moved = true;
            }
        }

        if (moved) { moves++; }
        render();
        if (moved) checkWin();
    }

    function handleDropFromFreecell(card, freeIndex, pileEl) {
        var pileType = pileEl.dataset.pile;
        var moved = false;

        if (pileType.indexOf('tab-') === 0) {
            var destCol = parseInt(pileType.split('-')[1], 10);
            if (canPlaceOnTableau(card, tableau[destCol])) {
                freecells[freeIndex] = null;
                tableau[destCol].push(card);
                moved = true;
            }
        } else if (pileType.indexOf('found-') === 0) {
            var suit = pileType.split('-')[1];
            if (suit === card.suit && canPlaceOnFoundation(card, foundations[suit])) {
                freecells[freeIndex] = null;
                foundations[suit].push(card);
                moved = true;
            }
        }

        if (moved) { moves++; }
        render();
        if (moved) checkWin();
    }

    // double-click / double-tap: auto-send to a foundation if possible
    function attachAutoMove() {
        document.querySelector('.sol-table').addEventListener('dblclick', function (e) {
            var el = e.target.closest('.sol-card');
            if (!el) return;
            var rank = el.dataset.rank, suit = el.dataset.suit;

            // find the card + its current location
            for (var c = 0; c < 8; c++) {
                var col = tableau[c];
                var idx = col.findIndex(function (cd) { return cd.rank === rank && cd.suit === suit; });
                if (idx === col.length - 1 && idx !== -1 && canPlaceOnFoundation(col[idx], foundations[suit])) {
                    col.splice(idx, 1);
                    foundations[suit].push({ rank: rank, suit: suit, faceUp: true, el: el });
                    moves++;
                    render();
                    checkWin();
                    return;
                }
            }
            for (var f = 0; f < 4; f++) {
                var fc = freecells[f];
                if (fc && fc.rank === rank && fc.suit === suit && canPlaceOnFoundation(fc, foundations[suit])) {
                    freecells[f] = null;
                    foundations[suit].push(fc);
                    moves++;
                    render();
                    checkWin();
                    return;
                }
            }
        });
    }

    function newGame() {
        tableau = [[], [], [], [], [], [], [], []];
        freecells = [null, null, null, null];
        foundations = { H: [], D: [], C: [], S: [] };
        moves = 0;
        if (timer) timer.stop();
        timer = SolEngine.startTimer(timerEl);
        deal();
        render();
    }

    document.getElementById('newGameBtn').addEventListener('click', newGame);
    attachAutoMove();
    newGame();
})();
