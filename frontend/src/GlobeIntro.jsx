import React, { useEffect, useRef, useState } from "react";
import MapView from "./MapView.jsx";

const careSignals = [
  { lat: 38.5449, lon: -121.7405 },
  { lat: 37.7749, lon: -122.4194 },
  { lat: 38.5816, lon: -121.4944 }
];

export default function GlobeIntro() {
  const [showMap, setShowMap] = useState(false);

  return (
    <section className={`globe-transition${showMap ? " globe-transition--map" : ""}`}>
      <div className="globe-stage" aria-hidden={showMap}>
        <div className="globe-copy">
          <p className="eyebrow">Care Near You</p>
          <h2>Start global. Land local.</h2>
          <p>
            Search affirming care from a calm launch point, then move straight into the map.
          </p>
          <button type="button" onClick={() => setShowMap(true)}>
            Open Map
          </button>
        </div>

        <ThreeGlobe />
      </div>

      <div className="globe-map-frame" aria-hidden={!showMap}>
        {showMap && <MapView />}
      </div>
    </section>
  );
}

function ThreeGlobe() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationFrame = 0;
    let renderer;
    let cleanup = () => {};

    async function mountGlobe() {
      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js");

      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      const globeGroup = new THREE.Group();
      const markerGroup = new THREE.Group();

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      camera.position.set(0, 0, 4.7);
      scene.add(globeGroup);
      globeGroup.add(markerGroup);

      const globeMaterial = new THREE.MeshStandardMaterial({
        color: 0x176b87,
        roughness: 0.82,
        metalness: 0.08
      });
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1.55, 72, 72), globeMaterial);
      globeGroup.add(globe);

      const wireframe = new THREE.Mesh(
        new THREE.SphereGeometry(1.565, 36, 18),
        new THREE.MeshBasicMaterial({
          color: 0xb9e6ee,
          transparent: true,
          opacity: 0.16,
          wireframe: true
        })
      );
      globeGroup.add(wireframe);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.68, 72, 72),
        new THREE.MeshBasicMaterial({
          color: 0x7ed7e6,
          transparent: true,
          opacity: 0.16,
          side: THREE.BackSide
        })
      );
      globeGroup.add(atmosphere);

      careSignals.forEach((signal) => {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 18, 18),
          new THREE.MeshBasicMaterial({ color: 0xffd166 })
        );
        marker.position.copy(latLonToVector3(signal.lat, signal.lon, 1.61, THREE));
        markerGroup.add(marker);
      });

      scene.add(new THREE.AmbientLight(0xffffff, 1.8));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-2, 2.3, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x75d7ff, 2.2);
      rimLight.position.set(3, -1.5, -2);
      scene.add(rimLight);

      function resize() {
        const { width, height } = canvas.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(width));
        const nextHeight = Math.max(1, Math.floor(height));
        renderer.setSize(nextWidth, nextHeight, false);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
      }

      function animate() {
        resize();
        globeGroup.rotation.y += 0.0045;
        globeGroup.rotation.x = -0.18;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(animate);
      }

      animate();

      cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        globe.geometry.dispose();
        globeMaterial.dispose();
        wireframe.geometry.dispose();
        wireframe.material.dispose();
        atmosphere.geometry.dispose();
        atmosphere.material.dispose();
        markerGroup.children.forEach((marker) => {
          marker.geometry.dispose();
          marker.material.dispose();
        });
        renderer.dispose();
      };
    }

    mountGlobe().catch(() => {});

    return () => cleanup();
  }, []);

  return (
    <div className="globe-visual" aria-hidden="true">
      <canvas className="globe-canvas" ref={canvasRef} />
      <div className="globe-shadow" />
    </div>
  );
}

function latLonToVector3(lat, lon, radius, THREE) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
