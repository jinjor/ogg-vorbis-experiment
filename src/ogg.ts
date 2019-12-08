export function assertCapturePattern(v: DataView, p: number, expected: string) {
  let capture_pattern = "";
  for (let i = 0; i < expected.length; i++) {
    capture_pattern += String.fromCharCode(v.getUint8(p + i));
  }
  if (capture_pattern !== expected) {
    throw new Error(
      `Invalid capture_pattern: expected = "${expected}", actual = "${capture_pattern}"`
    );
  }
}

export interface PacketReader {
  readSegment(v: DataView, p: number, length: number): void;
}

export class OggReader {
  read(v: DataView, packetReader: PacketReader): void {
    let p = 0;
    let expectedPageSequenceNo = 0;
    while (true) {
      assertCapturePattern(v, p, "OggS");
      p += 4;
      const stream_structure_version = v.getUint8(p++);
      /**
       *  1: continued packet
       *  2: first page of logical bitstream (bos)
       *  4: last page of logical bitstream (eos)
       */
      const header_type_flag = v.getUint8(p++);
      if (header_type_flag & 4) {
        break;
      }
      const absoluteGranulePosition =
        v.getUint32(p, true) * 2 ** 32 + v.getUint32(p + 4, true);
      p += 8;
      const streamSerialNumber = v.getUint32(p, true);
      p += 4;
      const pageSequenceNo = v.getUint32(p, true);
      p += 4;
      if (pageSequenceNo !== expectedPageSequenceNo++) {
        throw new Error("Invalid pageSequenceNo: " + pageSequenceNo);
      }
      const pageCheckSum = v.getUint32(p, true);
      p += 4;
      const pageSegments = v.getUint8(p++);
      const lacingValue = [];
      for (let i = 0; i < pageSegments; i++) {
        lacingValue.push(v.getUint8(p++));
      }
      for (let i = 0; i < lacingValue.length; i++) {
        const segmentLength = lacingValue[i];
        packetReader.readSegment(v, p, segmentLength);
        p += segmentLength;
      }
    }
  }
}
