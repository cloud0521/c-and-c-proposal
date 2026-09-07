import { useEffect, useRef } from "react";
import logoLogo from "../logo.png";

export function EditorialPhoto({ photo, className, priority = false }) {
  return (
    <picture className={`editorial-picture ${className}`}>
      {photo.mobileSrc && (
        <source
          media="(max-width: 600px)"
          srcSet={photo.mobileSrcSet}
          sizes="100vw"
        />
      )}
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(max-width: 600px) 100vw, min(760px, 70vw)"
        alt={photo.alt}
        style={{
          "--desktop-position": photo.desktopPosition,
          "--mobile-position": photo.mobilePosition,
        }}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

export function ProposalMonogram({ mode, monogramRef }) {
  return (
    <img
      ref={monogramRef}
      src={logoLogo}
      alt={mode === "hero" ? "Cloyd and Cyrin monogram" : ""}
      aria-hidden={mode !== "hero"}
      className={`proposal-monogram proposal-monogram--${mode}`}
    />
  );
}

export function GreenScreenVideo({ src }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return undefined;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let animationFrameId;

    const render = () => {
      if (video.paused || video.ended) return;
      if (video.videoWidth && video.videoHeight) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = frame.data;
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index + 1] > 90 &&
            pixels[index] < 90 &&
            pixels[index + 2] < 90
          )
            pixels[index + 3] = 0;
        }
        context.putImageData(frame, 0, 0);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    const handlePlay = () => render();
    video.addEventListener("play", handlePlay);
    video.currentTime = 0;
    video.play().catch(() => {});
    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("play", handlePlay);
    };
  }, []);

  return (
    <div className="rings-container-wrapper">
      <video
        ref={videoRef}
        src={src}
        loop
        muted
        playsInline
        preload="auto"
        className="media-preloader"
      />
      <canvas
        ref={canvasRef}
        className="rings-animation-img"
        aria-hidden="true"
      />
      <div className="ring-glint glint-1" />
      <div className="ring-glint glint-2" />
      <div className="ring-glint glint-3" />
    </div>
  );
}
