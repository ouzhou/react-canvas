import "./style.css";
import { createCrawlerIkSketch } from "./crawler-ik-demo";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = "";
const root = document.createElement("div");
root.id = "crawler-ik-root";
app.appendChild(root);
createCrawlerIkSketch(root);
