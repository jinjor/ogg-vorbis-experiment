import { assertCapturePattern, PacketReader } from "./ogg";

export class Vorbis implements PacketReader {
  // Identification header
  vorbisVersion: number;
  audioChannels: number;
  audioSampleRate: number;
  bitrateMaximum: number;
  bitrateNominal: number;
  bitrateMinimum: number;
  blocksize0: number;
  blocksize1: number;
  // Comment header
  vendorString: string;
  userCommentList: string[] = [];
  // Setup header
  constructor() {}
  readPacket(buffer: ArrayBuffer): number {
    const v = new DataView(buffer);
    let p = 0;
    const packet_type = v.getUint8(p++);
    if (packet_type === 1) {
      p = this.readIdentificationHeader(v, p);
    } else if (packet_type === 3) {
      p = this.readCommentHeader(v, p);
    } else if (packet_type === 5) {
      p = this.readSetupHeader(v, p);
    }
    return p;
  }
  private readIdentificationHeader(v: DataView, p: number): number {
    assertCapturePattern(v, p, "vorbis");
    p += 6;
    this.vorbisVersion = v.getUint32(p, true);
    p += 4;
    if (this.vorbisVersion !== 0) {
      throw new Error("Unsupported vorbis version: " + this.vorbisVersion);
    }
    this.audioChannels = v.getUint8(p++);
    this.audioSampleRate = v.getUint32(p, true);
    p += 4;
    this.bitrateMaximum = v.getInt32(p, true);
    p += 4;
    this.bitrateNominal = v.getInt32(p, true);
    p += 4;
    this.bitrateMinimum = v.getInt32(p, true);
    p += 4;
    const blocksize = v.getUint8(p++);
    this.blocksize0 = (blocksize >> 4) % 16; // TODO: correct?
    this.blocksize1 = blocksize % 16; // TODO: correct?
    const framing_flag = v.getUint8(p++);
    if (framing_flag === 0) {
      throw new Error("framing_flag must be nonzero");
    }
    return p;
  }
  private readCommentHeader(v: DataView, p: number): number {
    assertCapturePattern(v, p, "vorbis");
    p += 6;
    const vendor_length = v.getUint32(p, true);
    p += 4;
    this.vendorString = new TextDecoder().decode(
      v.buffer.slice(p, p + vendor_length)
    );
    p += vendor_length;
    const user_comment_list_length = v.getUint32(p, true);
    p += 4;
    for (let i = 0; i < user_comment_list_length; i++) {
      const length = v.getUint32(p, true);
      p += 4;
      const keyValue = new TextDecoder().decode(v.buffer.slice(p, p + length));
      p += length;
      this.userCommentList.push(keyValue);
    }
    const framing_flag = v.getUint8(p++);
    if (framing_flag === 0) {
      throw new Error("framing_flag must be nonzero");
    }
    return p;
  }
  private readSetupHeader(v: DataView, p: number): number {
    assertCapturePattern(v, p, "vorbis");
    p += 6;
    return p;
  }
}
