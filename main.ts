const styleCSS = `
  html, body {
    display: grid;
    min-height: 100%;
    margin: 0;
  }

  body {
    background: #000;
    color: #666;
    align-items: center;
    justify-content: center;
  }

  pre {
    line-height: 16px;
    font-family: monospace;
    font-size: 16px;
    margin: 0;
  }
  pre span {
    width: 8px;
    height: 16px;
    display: inline-block;
    transform-origin: center bottom;
    overflow: hidden;
  }
`;

type CharacterCell = [string, unknown];

const CharacterCell = (character = " ", style: unknown = {}): CharacterCell => {
  return [character, style];
};

const vec2 = (x = 0, y = 0): [number, number] => [x, y];

vec2.add = (a: readonly number[], b: readonly number[]): [number, number] => {
  return [(a[0] | 0) + (b[0] | 0), (a[1] | 0) + (b[1] | 0)];
};

const repeatingTimeout = 29.98;

type TetrominoName = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

enum TetrominoPoint {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}
// rgb(3 255 255 / 10%)
const tetrominoColors: Record<TetrominoName, string> = {
  I: "0 255 255",
  O: "255 255 0",
  T: "128 0 255",
  S: "0 192 0",
  Z: "255 0 0",
  J: "64 64 255",
  L: "255 128 0",
};

const tetrominoShapes: Record<TetrominoName, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const fallTimeoutByLevel = [
  1000, 793, 617.8, 472.73, 355.2, 262, 189.68, 134.73, 93.88, 64.15, 42.98,
  28.22, 18.15, 11.44, 7.06, 4.26, 2.52, 1.46, 0.82, 0.46,
];

const wallKickData = {
  JLSTZ: {
    clockwise: [
      [vec2(+0, -1), vec2(-1, -1), vec2(+2, +0), vec2(+2, -1)],
      [vec2(+0, +1), vec2(+1, +1), vec2(-2, +0), vec2(-2, +1)],
      [vec2(+0, +1), vec2(-1, +1), vec2(+2, +0), vec2(+2, +1)],
      [vec2(+0, -1), vec2(+1, -1), vec2(-2, +0), vec2(-2, -1)],
    ],
    counterClockwise: [
      [vec2(+0, +1), vec2(-1, +1), vec2(+2, +0), vec2(+2, +1)],
      [vec2(+0, +1), vec2(+1, +1), vec2(-2, +0), vec2(-2, +1)],
      [vec2(+0, -1), vec2(-1, -1), vec2(+2, +0), vec2(+2, -1)],
      [vec2(+0, -1), vec2(+1, -1), vec2(-2, +0), vec2(-2, -1)],
    ],
  },
  I: {
    clockwise: [
      [vec2(+0, -2), vec2(+0, +1), vec2(+1, -2), vec2(-2, +1)],
      [vec2(+0, -1), vec2(+0, +2), vec2(-2, -1), vec2(+1, +2)],
      [vec2(+0, +2), vec2(+0, -1), vec2(-1, +2), vec2(+2, -1)],
      [vec2(+0, +1), vec2(+0, -2), vec2(+2, +1), vec2(-1, -2)],
    ],
    counterClockwise: [
      [vec2(+0, -1), vec2(+0, +2), vec2(-2, -1), vec2(+1, +2)],
      [vec2(+0, +2), vec2(+0, -1), vec2(-1, +2), vec2(+2, -1)],
      [vec2(+0, +1), vec2(+0, -2), vec2(+2, +1), vec2(-1, -2)],
      [vec2(+0, -2), vec2(+0, +1), vec2(+1, -2), vec2(-2, +1)],
    ],
  },
};

function renderText(
  screen: CharacterCell[][],
  top: number,
  left: number,
  text?: string | null,
  style?: unknown,
) {
  if (!text) return;
  screen[top].splice(
    left,
    text.length,
    ...[...text].map((character) => CharacterCell(character, style)),
  );
}

function renderTetromino(
  screen: CharacterCell[][],
  top: number,
  left: number,
  tetrominoName?: TetrominoName | null,
) {
  const shape = tetrominoName ? tetrominoShapes[tetrominoName] : [];
  const color = tetrominoName ? `rgb(${tetrominoColors[tetrominoName]})` : null;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const block = shape[r]?.[shape.length === 2 ? c - 1 : c];
      const cell = block
        ? CharacterCell("█", color && { color })
        : CharacterCell("░", { color: null });
      const oc = shape.length === 3 ? 1 : 0;
      screen[r + top][2 * c + left + oc] = screen[r + top][
        2 * c + 1 + left + oc
      ] = cell;
    }
  }
}

function rotateTetrominoShape<T>(tetromino: T[][], isClockwise: boolean) {
  const last = tetromino.length - 1;
  return [...Array(tetromino.length)].map((_, i) =>
    [...Array(tetromino.length)].map((_, j) => {
      return tetromino[isClockwise ? last - j : j][isClockwise ? i : last - i];
    }),
  );
}

function* eachFallingBlockPosition(
  position: readonly [number, number],
  shape: number[][],
) {
  const size = shape.length;
  for (let sRow = 0; sRow < size; sRow++) {
    for (let sCol = 0; sCol < size; sCol++) {
      if (!shape[sRow][sCol]) continue;
      const pfRow = position[0] + sRow;
      const pfCol = position[1] + sCol - (size === 2 ? 0 : 1);
      yield [pfRow, pfCol];
    }
  }
}

const rand = (i: number) => Math.floor(Math.random() * i);

function createGame() {
  let bag: TetrominoName[] = [];
  const generatePiece = () => {
    if (bag.length === 0) {
      bag = ["I", "J", "L", "O", "S", "T", "Z"];
      for (let i = bag.length, j = rand(i--); i > 0; j = rand(i--)) {
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop() as TetrominoName;
  };

  const state = {
    generatePiece,
    beginAt: performance.now(),
    time: 0,
    hold: null as null | TetrominoName,
    isHoldUsed: false,
    queue: [...Array(3)].map(generatePiece),
    current: {
      name: "I" as TetrominoName,
      shape: tetrominoShapes.I,
      point: TetrominoPoint.Up,
      position: [1, 4] as [number, number],
      groundRow: 0,
    },
    lastFallenAt: 0,
    lockAfter: +Infinity,
    playfield: [...[...Array(22)].map(() => [...Array(10)].map(() => 0))],
    playfieldColor: [
      ...[...Array(22)].map(() =>
        [...Array(10)].map(() => null as string | null),
      ),
    ],
    stats: { score: 0, level: 1, lines: 0 },
    isActive: true,
    lastRepeatedAt: {} as Record<string, number>,
    clearing: null as null | { lines: number[]; doAfter: number },
  };
  popPiece(state, false);
  return state;
}

type Game = ReturnType<typeof createGame>;

const terminal = document.createElement("pre");
terminal.append(
  ...[...Array(24)].map(() => {
    const line = document.createElement("div");
    line.append(
      ...[...Array(80)].map(() => {
        const characterCell = document.createElement("span");
        characterCell.style.color = "inherit";
        return characterCell;
      }),
    );
    return line;
  }),
);

const controller = new AbortController();
const signal = controller.signal;

function isInPlayfield(game: Game, r: number, c: number) {
  return (
    r >= 0 &&
    r < game.playfield.length &&
    c >= 0 &&
    c < game.playfield[0].length
  );
}

function detectCollision(
  game: Game,
  position = game.current.position,
  shape = game.current.shape,
) {
  for (const [r, c] of eachFallingBlockPosition(position, shape)) {
    if (!isInPlayfield(game, r, c) || game.playfield[r][c]) return true;
  }
  return false;
}

function findGroundRow(game: Game) {
  for (
    let groundRow = game.current.position[0];
    groundRow < game.playfield.length;
    groundRow++
  ) {
    if (detectCollision(game, [groundRow, game.current.position[1]]))
      return groundRow - 1;
  }
  return game.playfield.length - 1;
}

function popPiece(game: Game, useHold: boolean) {
  let prevHold = null as TetrominoName | null;
  if (useHold) {
    game.isHoldUsed = true;
    prevHold = game.hold;
    game.hold = game.current.name;
  } else {
    game.isHoldUsed = false;
  }
  if (prevHold) {
    game.current.name = prevHold;
    game.current.shape = tetrominoShapes[game.current.name];
  } else {
    game.current.name = game.queue.shift() as TetrominoName;
    game.current.shape = tetrominoShapes[game.current.name];
    game.queue.push(game.generatePiece());
  }
  game.current.point = TetrominoPoint.Up;
  game.current.position = [2, 4];
  if (detectCollision(game) && game.current.name !== "I")
    game.current.position = [1, 4];
  if (detectCollision(game)) {
    console.log("Game Over!");
    game.isActive = false;
  }
  game.lockAfter = +Infinity;
  game.lastFallenAt = game.time;
  game.current.groundRow = findGroundRow(game);
}

function detectGround(game: Game) {
  if (detectCollision(game, vec2.add(game.current.position, [1, 0]))) {
    game.current.groundRow = game.current.position[0];
    game.lockAfter = game.time + 500;
  } else {
    game.current.groundRow = findGroundRow(game);
    game.lockAfter = +Infinity;
  }
}

function softDrop(game: Game) {
  if (game.lockAfter !== +Infinity) return;
  game.stats.score++;
  game.current.position[0]++;
  game.lastFallenAt = game.time;
  game.lockAfter = detectCollision(
    game,
    vec2.add(game.current.position, [1, 0]),
  )
    ? game.time + 500
    : +Infinity;
}

function hardDrop(game: Game) {
  game.lastFallenAt = game.time;
  const delta = game.current.groundRow - game.current.position[0];
  if (delta) game.stats.score += 2 * delta;
  game.current.position[0] = game.current.groundRow;
  game.lockAfter = game.time;
}

function rotateCurrentPiece(game: Game, isClockwise: boolean) {
  const { current } = game;
  const pos = current.position;
  const nextShape = rotateTetrominoShape(current.shape, isClockwise);
  let delta = vec2();
  let hasCollision = detectCollision(game, pos, nextShape);
  if (hasCollision) {
    const dirname = isClockwise ? "clockwise" : "counterClockwise";
    const kickTable = (
      current.name === "I" ? wallKickData.I : wallKickData.JLSTZ
    )[dirname];
    console.log(
      `It has collison. Test ${dirname} wall kick for ${current.name} at point ${current.point}.`,
    );
    for (let i = 0; i < kickTable[current.point].length; i++) {
      const testingDelta = kickTable[current.point][i];
      if (!detectCollision(game, vec2.add(pos, testingDelta), nextShape)) {
        console.log(`Wall Kick test #${i + 1} succeed for ${current.name}.`);
        delta = testingDelta;
        hasCollision = false;
        break;
      } else {
        console.log(`Wall Kick test #${i + 1} failed for ${current.name}.`);
      }
    }
  }

  if (!hasCollision) {
    current.position[0] += delta[0];
    current.position[1] += delta[1];
    const prevPoint = current.point;
    current.point = (current.point + (isClockwise ? 1 : 4 - 1)) % 4;
    console.log(`${prevPoint} >> ${current.point}`);
    current.shape = nextShape;
    detectGround(game);
  }
}

function movePieceWithinRow(game: Game, delta: number) {
  const [r, c] = game.current.position;
  if (detectCollision(game, [r, c + delta])) return;
  game.current.position[1] += delta;
  detectGround(game);
}

function handleKeyCommand(game: Game, key: string) {
  if (key === "ArrowUp" || key === "z") {
    rotateCurrentPiece(game, key === "ArrowUp");
  } else if (key === "ArrowLeft" || key === "ArrowRight") {
    movePieceWithinRow(game, key === "ArrowLeft" ? -1 : 1);
  } else if (key === "ArrowDown") {
    softDrop(game);
  } else if (key === " ") {
    hardDrop(game);
  } else if (key === "c" && !game.isHoldUsed) {
    popPiece(game, true);
  } else {
    return false;
  }
  return true;
}

function setKeyRepeating(game: Game, key: string) {
  const delay = key === " " || key === "c" ? +Infinity : 150;
  game.lastRepeatedAt[key] = game.time + delay - repeatingTimeout;
}

function updateGame(game: Game) {
  if (!game.isActive) return;
  const {
    time,
    lastFallenAt,
    lockAfter,
    playfield,
    playfieldColor,
    stats,
    current,
    clearing,
  } = game;

  for (const [key, lastRepeatedAt] of Object.entries(game.lastRepeatedAt)) {
    const repeatingTimes = Math.floor(
      (time - lastRepeatedAt) / repeatingTimeout,
    );
    if (repeatingTimes > 0) {
      for (let i = 0; i < repeatingTimes; i++) {
        console.log("repeating", key, `${i + 1}/${repeatingTimes}`);
        handleKeyCommand(game, key);
      }
      game.lastRepeatedAt[key] += repeatingTimes * repeatingTimeout;
    }
  }

  if (clearing) {
    if (time < clearing.doAfter) return;
    const width = playfield[0].length;
    const nClearedLines = clearing.lines.length;
    game.playfield = [
      ...[...Array(nClearedLines)].map(() => [...Array(width)].map(() => 0)),
      ...game.playfield.filter((_, i) => !clearing.lines.includes(i)),
    ];
    game.playfieldColor = [
      ...[...Array(nClearedLines)].map(() => [...Array(width)].map(() => null)),
      ...game.playfieldColor.filter((_, i) => !clearing.lines.includes(i)),
    ];
    game.clearing = null;

    if (nClearedLines) {
      playfield.unshift(
        ...[...Array(nClearedLines)].map(() => [...Array(width)].map(() => 0)),
      );
      stats.lines += nClearedLines;
      if (nClearedLines === 1) stats.score += 100;
      else if (nClearedLines === 2) stats.score += 300 * stats.level;
      else if (nClearedLines === 3) stats.score += 500 * stats.level;
      else if (nClearedLines === 4) stats.score += 800 * stats.level;
      stats.level = Math.floor(stats.lines / 10) + 1;
    }

    popPiece(game, false);
  } else if (time > lockAfter) {
    let minAffected = playfield.length - 1;
    let maxAffected = 0;
    for (const [r, c] of eachFallingBlockPosition(
      current.position,
      current.shape,
    )) {
      if (!isInPlayfield(game, r, c)) continue;
      playfield[r][c] = 1;
      playfieldColor[r][c] = tetrominoColors[current.name];
      minAffected = Math.min(r, minAffected);
      maxAffected = Math.max(maxAffected, r);
    }

    const clearedLines = [];
    for (let r = minAffected; r < playfield.length && r <= maxAffected; r++) {
      let canClear = true;
      for (let c = 0; canClear && c < playfield[r].length; c++) {
        if (!playfield[r][c]) canClear = false;
      }
      if (canClear) clearedLines.push(r);
    }

    if (clearedLines.length)
      game.clearing = { lines: clearedLines, doAfter: game.time + 300 };
    else popPiece(game, false);
  } else if (lockAfter === +Infinity) {
    const fallTimeout = fallTimeoutByLevel[Math.min(stats.level, 20) - 1];
    const fallDistance = Math.floor((time - lastFallenAt) / fallTimeout);
    if (fallDistance > 0) {
      game.current.position[0] = Math.min(
        current.position[0] + fallDistance,
        current.groundRow,
      );
      game.lastFallenAt += fallDistance * fallTimeout;
      if (detectCollision(game, vec2.add(current.position, [1, 0])))
        game.lockAfter = game.time + 500;
    }
  }
}

function renderGame(game: Game) {
  const screen = [...Array(24)].map(() =>
    [...Array(80)].map(() => CharacterCell()),
  );

  renderText(screen, 2, 18, "HOLD");
  for (let i = 0; i < 4; i++)
    renderText(screen, 3 + i, 18, "░".repeat(10), { color: null });
  renderTetromino(screen, 4, 19, game.hold);

  renderText(screen, 16, 18, "SCORE");
  renderText(screen, 17, 18, `${game.stats.score.toLocaleString()}`);
  renderText(screen, 18, 18, "LEVEL");
  renderText(screen, 19, 18, `${game.stats.level}`);
  renderText(screen, 20, 18, "LINES");
  renderText(screen, 21, 18, `${game.stats.lines.toLocaleString()}`);

  for (let r = 2; r < game.playfield.length; r++) {
    for (let c = 0; c < game.playfield[r].length; c++) {
      const block = game.playfield[r][c];
      const transform = game.clearing?.lines.includes(r)
        ? `scaleY(${(game.clearing.doAfter - game.time) / 300})`
        : null;
      const color = `rgb(${game.playfieldColor[r][c]})`;
      if (block) {
        screen[r][2 * c + 29] = screen[r][2 * c + 1 + 29] = CharacterCell("█", {
          color,
          transform,
        });
      } else {
        screen[r][2 * c + 29] = screen[r][2 * c + 1 + 29] = CharacterCell("░", {
          color: null,
          transform: null,
        });
      }
    }
  }

  const ghostPosition: [number, number] = [
    game.current.groundRow,
    game.current.position[1],
  ];
  for (const [r, c] of eachFallingBlockPosition(
    ghostPosition,
    game.current.shape,
  )) {
    if (!isInPlayfield(game, r, c) || r < 2) continue;
    const color = `rgb(${tetrominoColors[game.current.name]})`;
    const style = Object.assign(screen[r][2 * c + 1 + 29][1] as object, {
      color,
    });
    screen[r][2 * c + 29] = screen[r][2 * c + 1 + 29] = CharacterCell(
      "▒",
      style,
    );
  }

  let color = `rgb(${tetrominoColors[game.current.name]})`;
  if (!game.clearing && game.lockAfter !== +Infinity) {
    const opacity = 0.33 + 0.67 * ((game.lockAfter - game.time) / 500);
    color = `rgb(${tetrominoColors[game.current.name]} / ${Math.round(opacity * 100)}%)`;
  }
  for (const [r, c] of eachFallingBlockPosition(
    game.current.position,
    game.current.shape,
  )) {
    if (!isInPlayfield(game, r, c) || r < 2) continue;
    const style = Object.assign(screen[r][2 * c + 1 + 29][1] as object, {
      color,
    });
    screen[r][2 * c + 29] = screen[r][2 * c + 1 + 29] = CharacterCell(
      "█",
      style,
    );
  }

  renderText(screen, 2, 50, "NEXT");
  for (let i = 0; i < 10; i++)
    renderText(screen, 3 + i, 50, "░".repeat(10), { color: null });
  renderTetromino(screen, 4, 51, game.queue[0]);
  renderTetromino(screen, 7, 51, game.queue[1]);
  renderTetromino(screen, 10, 51, game.queue[2]);

  for (let r = 0; r < screen.length; r++) {
    for (let c = 0; c < screen[r].length; c++) {
      const [character, style] = screen[r][c];
      const cellElement = terminal.children[r].children[c] as HTMLSpanElement;
      Object.assign(cellElement.style, style);
      cellElement.textContent = character;
    }
  }
}

async function main() {
  document.head.appendChild(
    Object.assign(document.createElement("style"), { innerHTML: styleCSS }),
  );
  document.body.appendChild(terminal);

  let game = createGame();
  let begin = performance.now();
  requestAnimationFrame(async function callback() {
    if (signal.aborted) return;
    game.time = performance.now() - begin;
    updateGame(game);
    renderGame(game);
    if (!signal.aborted) requestAnimationFrame(callback);
  });

  const keyPressed: string[] = [];
  window.addEventListener("keydown", (e) => {
    if (!game.isActive) {
      game = createGame();
      begin = performance.now();
      updateGame(game);
    } else {
      const { key } = e;
      if (key in game.lastRepeatedAt) return;
      const shouldUpdate = handleKeyCommand(game, key);
      if (!shouldUpdate) return;
      keyPressed.push(key);
      updateGame(game);
      setKeyRepeating(game, key);
    }
  });

  window.addEventListener("keyup", (e) => {
    delete game.lastRepeatedAt[e.key];
  });
}

export default main;
