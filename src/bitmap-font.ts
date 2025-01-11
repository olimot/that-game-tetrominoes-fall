export const CP437Map = Array.from(
  "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■",
  (it, i) => ({ [it.codePointAt(0) || 0]: i }) as Record<number, number>,
).reduce((a, b) => ({ ...a, ...b }));

const dot = new Uint8ClampedArray(4).fill(255);
export async function inflateBitmap(input: string | URL, width: number) {
  const arrayBuffer = await fetch(input).then((res) => res.arrayBuffer());
  const nPixels = arrayBuffer.byteLength * 8;
  const src = new Uint8Array(arrayBuffer);
  const dst = new ImageData(width, nPixels / width);
  for (let i = 0; i < nPixels; i++) {
    if (src[i >> 3] & (128 >> i % 8)) dst.data.set(dot, i * 4);
  }
  return createImageBitmap(dst);
}

const ftcanvas = new OffscreenCanvas(640, 16);
const ftctx = ftcanvas.getContext("2d")!;

type C2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type IB = ImageBitmap;
export function fillText(context: C2D, cp437: IB, text: string, x = 0, y = 0) {
  const width = text.length * 8;
  if (ftcanvas.width < width) ftcanvas.width = width;
  ftctx.clearRect(0, 0, width, 16);

  for (let i = 0, cursor = 0; i < text.length; i++) {
    const unicode = text.codePointAt(i);
    if (unicode === undefined || unicode === 10) break;
    const code = CP437Map[unicode];
    ftctx.drawImage(cp437, 0, code * 16, 8, 16, cursor, 0, 8, 16);
    cursor += 8;
  }

  ftctx.save();
  ftctx.globalCompositeOperation = "source-in";
  ftctx.fillStyle = context.fillStyle;
  ftctx.fillRect(0, 0, width, 16);
  ftctx.restore();

  context.drawImage(ftcanvas, 0, 0, width, 16, x, y, width, 16);
}
