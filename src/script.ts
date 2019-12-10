import { OggReader } from "./ogg";
import { Vorbis } from "./vorbis";

export {};
declare global {
  interface Window {
    chooseFileSystemEntries: any;
  }
}
function id(): string {
  return '_' + Math.random().toString(36).substr(2, 9); // prettier-ignore
}

type OggFile = {
  id: string;
  file: File;
  vorbis: Vorbis;
};

class Model {
  private oggFiles: Map<string, OggFile> = new Map();
  getOgg(id: string): OggFile {
    return this.oggFiles.get(id);
  }
  setOggs(oggs: OggFile[]) {
    for (let ogg of oggs) {
      this.oggFiles.set(ogg.id, ogg);
    }
  }
  async read(id: string) {
    const oggFile = this.oggFiles.get(id);
    const buffer = await (oggFile.file as any).arrayBuffer();
    const oggReader = new OggReader(() => new Vorbis());
    oggReader.readPages(buffer);
    const vorbis = Array.from(oggReader.streams.values()).map(
      s => s.packetReader
    )[0];
    console.log(oggFile.file.name, vorbis);
  }
}

const model = new Model();

const open = document.getElementById("open");
open.addEventListener("click", async e => {
  const opts = { type: "openDirectory" };
  const handle = await window.chooseFileSystemEntries(opts);
  const entries = await handle.getEntries();
  let oggs = [];
  for await (const entry of entries) {
    if (entry.isFile && entry.name.endsWith(".ogg")) {
      const file = (await entry.getFile()) as File;
      oggs.push({
        id: id(),
        file
      });
    }
  }
  model.setOggs(oggs);
  renderTable(oggs);
  for (let ogg of oggs) {
    await model.read(ogg.id);
    updateRow(ogg.id);
  }
});
function renderTable(oggFiles: OggFile[]) {
  const tbody = document.getElementById("ogg-info-tbody");
  for (let oggFile of oggFiles) {
    insertRow(tbody, oggFile.id);
  }
}
function cloneTemplate(templateId: string, selector: string): HTMLElement {
  const template = document.getElementById(templateId) as any;
  return document.importNode(template.content, true).querySelector(selector);
}
function insertRow(tbody: HTMLElement, id: string) {
  const tr = cloneTemplate("ogg-info-tr", "tr");
  tr.id = id;
  tbody.appendChild(tr);
  updateRow(id);
}
function updateRow(id: string) {
  const ogg = model.getOgg(id);
  const tr = document.getElementById(id);
  tr.querySelector(".name").textContent = ogg.file.name;
  tr.querySelector(".size").textContent = formatBytes(ogg.file.size);
}
function formatBytes(n: number): string {
  const units = "KMG";
  let index = -1;
  while (n > 1000) {
    index++;
    n = n / 1000;
  }
  return `${n.toFixed(2)}${units[index] || ""}B`;
}
