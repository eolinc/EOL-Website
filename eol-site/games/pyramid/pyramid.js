/* ============================================================
   EOL Cards - Pyramid
   ============================================================ */

(function () {
    var rankValue = SolEngine.rankValue;

    var ROWS = 7;
    var pyramid = []; // pyramid[row][col] = card or null
    var stock = [];
    var waste = [];
    var redealsLeft = 2;
    var selected = null; // { source:'pyramid', row, col } | { source:'waste' }
    var removedCount = 0;
    var moves = 0;

    var moveCountEl = document.getElementById('moveCount');
    var timerEl = document.getElementById('timer');
    var redealsEl = document.getElementById('redealsLeft');
    var pyramidEl = document.getElementById('pyramid');
    var stockEl = document.getElementById('stockPile');
    var wasteEl = document.getElementById('wastePile');
    var timer = null;

    function deal() {
        var deck = SolEngine.shuffle(SolEngine.makeDeck());
        deck.forEach(function (c) { c.faceUp = true; });

        pyramid = [];
        var idx = 0;
        for (var r = 0; r < ROWS; r++) {
            var row = [];
            for (var c = 0; c <= r; c++) {
                row.push(deck[idx++]);
            }
            pyramid.push(row);
        }
        stock = deck.slice(idx);
        waste = [];
    }

    function isBlocked(r, c) {
        if (r === ROWS - 1) return false;
        var childLeft = pyramid[r + 1][c];
        var childRight = pyramid[r + 1][c + 1];
        return !!childLeft || !!childRight;
    }

    function isCleared() {
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c <= r; c++) {
                if (pyramid[r][c]) return false;
            }
        }
        return true;
    }

    function anyMovePossible() {
        // any exposed pyramid king, or exposed pair (pyramid/waste) summing to 13,
        // or stock/redeal still available
        var exposed = [];
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c <= r; c++) {
                if (pyramid[r][c] && !isBlocked(r, c)) exposed.push(pyramid[r][c]);
            }
        }
        if (waste.length) exposed.push(waste[waste.length - 1]);

        for (var i = 0; i < exposed.length; i++) {
            if (rankValue(exposed[i].rank) === 13) return true;
            for (var j = i + 1; j < exposed.length; j++) {
                if (rankValue(exposed[i].rank) + rankValue(exposed[j].rank) === 13) return true;
            }
        }
        return stock.length > 0 || redealsLeft > 0;
    }

    function checkEnd() {
        if (isCleared()) {
            timer.stop();
            SolEngine.showWinBanner(document.querySelector('.sol-table'), 'You cleared the Pyramid!');
            return;
        }
        if (!anyMovePossible()) {
            timer.stop();
            SolEngine.showWinBanner(document.querySelector('.sol-table'), 'No more moves \u2014 game over');
        }
    }

    var CARD_W = 70, CARD_H = 92;
    var COL_STEP = 42;
    var ROW_STEP = 62;

    function render() {
        pyramidEl.innerHTML = '';
        var centerX = pyramidEl.clientWidth / 2 || (COL_STEP * ROWS) / 2 + CARD_W / 2;

        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c <= r; c++) {
                var card = pyramid[r][c];
                if (!card) continue;
                var blocked = isBlocked(r, c);
                var el = SolEngine.renderCard(card);
                el.classList.toggle('sol-blocked', blocked);
                el.classList.toggle('sol-selected', selected && selected.source === 'pyramid' && selected.row === r && selected.col === c);

                var rowWidth = (r + 1) * COL_STEP;
                var x = centerX - rowWidth / 2 + c * COL_STEP - CARD_W / 2 + COL_STEP / 2;
                var y = r * ROW_STEP;

                el.style.left = x + 'px';
                el.style.top = y + 'px';
                el.style.zIndex = (ROWS - r) * 10;
                el.style.position = 'absolute';
                el.onclick = blocked ? null : (function (rr, cc) { return function () { onPickPyramid(rr, cc); }; })(r, c);
                pyramidEl.appendChild(el);
            }
        }

        // stock
        stockEl.innerHTML = '';
        if (stock.length > 0) {
            var backCard = { rank: 'A', suit: 'S', faceUp: false, el: null };
            var sEl = SolEngine.renderCard(backCard);
            sEl.style.left = '0px';
            sEl.style.top = '0px';
            sEl.onclick = drawFromStock;
            stockEl.appendChild(sEl);
        } else if (redealsLeft > 0) {
            var redealBtn = document.createElement('div');
            redealBtn.className = 'sol-redeal-btn';
            redealBtn.textContent = 'Redeal (' + redealsLeft + ')';
            redealBtn.onclick = redeal;
            stockEl.appendChild(redealBtn);
        }

        // waste
        wasteEl.innerHTML = '';
        if (waste.length > 0) {
            var top = waste[waste.length - 1];
            var wEl = SolEngine.renderCard(top);
            wEl.style.left = '0px';
            wEl.style.top = '0px';
            wEl.classList.toggle('sol-selected', selected && selected.source === 'waste');
            wEl.onclick = onPickWaste;
            wasteEl.appendChild(wEl);
        }

        moveCountEl.textContent = moves;
        redealsEl.textContent = redealsLeft;
    }

    function drawFromStock() {
        if (stock.length === 0) return;
        waste.push(stock.pop());
        moves++;
        selected = null;
        render();
        checkEnd();
    }

    function redeal() {
        if (redealsLeft <= 0 || stock.length > 0) return;
        redealsLeft--;
        stock = waste.reverse();
        waste = [];
        moves++;
        render();
        checkEnd();
    }

    function removeSingle(rank) {
        return rankValue(rank) === 13;
    }

    function onPickPyramid(r, c) {
        var card = pyramid[r][c];
        if (!card || isBlocked(r, c)) return;

        if (!selected) {
            if (removeSingle(card.rank)) {
                pyramid[r][c] = null;
                moves++;
                selected = null;
                render();
                checkEnd();
                return;
            }
            selected = { source: 'pyramid', row: r, col: c };
            render();
            return;
        }

        if (selected.source === 'pyramid' && selected.row === r && selected.col === c) {
            selected = null;
            render();
            return;
        }

        tryPair(card, function () { pyramid[r][c] = null; });
    }

    function onPickWaste() {
        if (waste.length === 0) return;
        var card = waste[waste.length - 1];

        if (!selected) {
            if (removeSingle(card.rank)) {
                waste.pop();
                moves++;
                selected = null;
                render();
                checkEnd();
                return;
            }
            selected = { source: 'waste' };
            render();
            return;
        }

        if (selected.source === 'waste') {
            selected = null;
            render();
            return;
        }

        tryPair(card, function () { waste.pop(); });
    }

    function tryPair(secondCard, removeSecond) {
        var firstCard = selected.source === 'pyramid'
            ? pyramid[selected.row][selected.col]
            : waste[waste.length - 1];

        if (rankValue(firstCard.rank) + rankValue(secondCard.rank) === 13) {
            if (selected.source === 'pyramid') {
                pyramid[selected.row][selected.col] = null;
            } else {
                waste.pop();
            }
            removeSecond();
            moves++;
            selected = null;
            render();
            checkEnd();
        } else {
            // invalid pair: switch selection to the newly clicked card instead
            selected = null;
            render();
        }
    }

    function newGame() {
        redealsLeft = 2;
        selected = null;
        moves = 0;
        if (timer) timer.stop();
        timer = SolEngine.startTimer(timerEl);
        deal();
        render();
    }

    document.getElementById('newGameBtn').addEventListener('click', newGame);
    window.addEventListener('resize', render);
    newGame();
})();
