import { assertCapturePattern, PacketReader } from "./ogg";

export class Vorbis implements PacketReader {
  // 1
  vorbis_version: number;
  audio_channels: number;
  audio_sample_rate: number;
  bitrate_maximum: number;
  bitrate_nominal: number;
  bitrate_minimum: number;
  blocksize_0: number;
  blocksize_1: number;
  // 3
  vendor_string: string;
  user_comment_list: string[] = [];
  private _from: number;
  constructor() {}
  readSegment(v: DataView, p: number, length: number): void {
    const endOfPacket = length < 255;
    if (endOfPacket) {
      const from = this._from != null ? this._from : p;
      this._from = null;
      this.readPacket(v, from);
    } else {
      if (this._from == null) {
        this._from = p;
      }
    }
  }
  private readPacket(v: DataView, p: number): void {
    const packet_type = v.getUint8(p++);
    if (packet_type === 1) {
      assertCapturePattern(v, p, "vorbis");
      p += 6;
      this.vorbis_version = v.getUint32(p, true);
      p += 4;
      if (this.vorbis_version !== 0) {
        throw new Error("Unsupported vorbis version: " + this.vorbis_version);
      }
      this.audio_channels = v.getUint8(p++);
      this.audio_sample_rate = v.getUint32(p, true);
      p += 4;
      this.bitrate_maximum = v.getInt32(p, true);
      p += 4;
      this.bitrate_nominal = v.getInt32(p, true);
      p += 4;
      this.bitrate_minimum = v.getInt32(p, true);
      p += 4;
      const blocksize = v.getUint8(p++);
      this.blocksize_0 = (blocksize >> 4) % 16; // TODO: correct?
      this.blocksize_1 = blocksize % 16; // TODO: correct?
      const framing_flag = v.getUint8(p++);
      if (framing_flag === 0) {
        throw new Error("framing_flag must be nonzero");
      }
    } else if (packet_type === 3) {
      assertCapturePattern(v, p, "vorbis");
      p += 6;
      const vendor_length = v.getUint32(p, true);
      p += 4;
      this.vendor_string = new TextDecoder().decode(
        v.buffer.slice(p, p + vendor_length)
      );
      p += vendor_length;
      const user_comment_list_length = v.getUint32(p, true);
      p += 4;
      for (let i = 0; i < user_comment_list_length; i++) {
        const length = v.getUint32(p, true);
        p += 4;
        const keyValue = new TextDecoder().decode(
          v.buffer.slice(p, p + length)
        );
        p += length;
        this.user_comment_list.push(keyValue);
      }
      const framing_flag = v.getUint8(p++);
      if (framing_flag === 0) {
        throw new Error("framing_flag must be nonzero");
      }
    } else if (packet_type === 5) {
      assertCapturePattern(v, p, "vorbis");
      p += 6;
    }
  }
}
