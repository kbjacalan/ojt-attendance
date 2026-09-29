import { useRef } from "react";
import { Wifi } from "lucide-react";
import caapLogo from "../../assets/caap_logo.png";
import { Truncate } from "../common/tableParts";
import "./AccountCard.css";

export default function AccountCard({
  fullName,
  email,
  role = "Administrator",
}) {
  const sceneRef = useRef(null);

  function handlePointerMove(e) {
    if (e.pointerType === "touch") return;
    const scene = sceneRef.current;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    scene.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    scene.style.setProperty("--rx", `${((0.5 - y) * 14).toFixed(2)}deg`);
    scene.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
    scene.dataset.active = "true";
  }

  function handlePointerLeave() {
    const scene = sceneRef.current;
    if (!scene) return;
    ["--mx", "--rx", "--ry"].forEach((name) =>
      scene.style.removeProperty(name),
    );
    delete scene.dataset.active;
  }

  return (
    <div
      ref={sceneRef}
      className="account-card-scene"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <article className="account-card" aria-label={`${role} account card`}>
        <span className="account-card-guilloche" aria-hidden="true" />
        <span className="account-card-holo" aria-hidden="true" />

        <div className="account-card-body">
          <header className="account-card-top">
            <div className="account-card-brand">
              <span className="account-card-logo">
                <img src={caapLogo} alt="" />
              </span>
              <span className="account-card-brand-text">
                <strong>CAAP</strong>
                <small>Dipolog Airport</small>
              </span>
            </div>
            <Wifi className="account-card-contactless" aria-hidden="true" />
          </header>

          <div className="account-card-identity">
            <Truncate
              className="account-card-email"
              text={email || "No email on file"}
            />
            <div className="account-card-bottom">
              <Truncate
                className="account-card-name"
                text={fullName || "Administrator"}
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
