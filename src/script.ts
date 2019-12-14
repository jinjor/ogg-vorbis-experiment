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
  private oggFiles: Map<string, OggFile>;
  getOggFiles(): OggFile[] {
    return Array.from(this.oggFiles.values());
  }
  getOggFile(id: string): OggFile {
    return this.oggFiles.get(id);
  }
  setOggFiles(oggs: OggFile[]) {
    this.oggFiles = new Map();
    for (let ogg of oggs) {
      this.oggFiles.set(ogg.id, ogg);
    }
  }
  getCommentKeys(): string[] {
    const keys = new Set<string>();
    for (const { vorbis } of this.getOggFiles()) {
      if (vorbis) {
        const userCommentList = vorbis.userCommentList;
        for (const key of Array.from(userCommentList.keys())) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys.values());
  }
  async read(id: string) {
    const oggFile = this.getOggFile(id);
    const buffer = await (oggFile.file as any).arrayBuffer();
    const oggReader = new OggReader(() => new Vorbis());
    oggReader.readPages(buffer);
    const vorbis = Array.from(oggReader.streams.values()).map(
      s => s.packetReader
    )[0];
    oggFile.vorbis = vorbis;
    console.log(vorbis);
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
  model.setOggFiles(oggs);
  renderTable();
  for (let ogg of oggs) {
    await model.read(ogg.id);
  }
  renderTable();
});
function renderTable() {
  renderHeader();
  renderBody();
}
function cloneTemplate(templateId: string, selector: string): HTMLElement {
  const template = document.getElementById(templateId) as any;
  return document.importNode(template.content, true).querySelector(selector);
}
function renderHeader() {
  const thead = document.getElementById("ogg-info-thead");
  const commentKeys = model.getCommentKeys();
  const tr = cloneTemplate("template-thead-tr", "tr");
  thead.innerHTML = "";
  thead.appendChild(tr);
  for (let key of commentKeys) {
    const th = cloneTemplate("template-thead-tr-th", "th");
    th.textContent = key;
    tr.appendChild(th);
  }
}
function renderBody() {
  const commentKeys = model.getCommentKeys();
  const tbody = document.getElementById("ogg-info-tbody");
  tbody.innerHTML = "";
  for (let oggFile of model.getOggFiles()) {
    insertRow(commentKeys, tbody, oggFile.id);
  }
}
function insertRow(commentKeys: string[], tbody: HTMLElement, id: string) {
  const tr = cloneTemplate("template-tbody-tr", "tr");
  const { file, vorbis } = model.getOggFile(id);
  tr.querySelector(".name").textContent = file.name;
  tr.querySelector(".size").textContent = formatBytes(file.size);
  if (vorbis) {
    for (let key of commentKeys) {
      const td = cloneTemplate("template-tbody-tr-td", "td");
      td.textContent = vorbis.userCommentList.get(key) || "";
      tr.appendChild(td);
    }
  }
  tbody.appendChild(tr);
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
