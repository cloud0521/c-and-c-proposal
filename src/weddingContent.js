import proposal960 from "./assets/photos/proposal-960.webp";
import proposal1920 from "./assets/photos/proposal-1920.webp";
import acceptanceWide960 from "./assets/photos/acceptance-wide-960.webp";
import acceptanceWide1920 from "./assets/photos/acceptance-wide-1920.webp";
import acceptanceClose960 from "./assets/photos/acceptance-close-960.webp";
import acceptanceClose1920 from "./assets/photos/acceptance-close-1920.webp";
import closing960 from "./assets/photos/closing-960.webp";
import closing1920 from "./assets/photos/closing-1920.webp";

export const PERSONAL_REVEAL_DURATION_MS = 2300;

export const roleDetails = {
  "Maid of Honor": {
    lead: "Will you stand beside me as my",
    category: "floral",
  },
  "Best Man": { lead: "Will you stand beside me as my", category: "branch" },
  Bridesmaid: { lead: "Will you stand beside us as a", category: "floral" },
  Groomsman: { lead: "Will you stand beside us as a", category: "branch" },
  "Candle Sponsor": {
    lead: "Will you help light the way as our",
    category: "candle",
  },
  "Veil Sponsor": {
    lead: "Will you join us in this meaningful tradition as our",
    category: "veil",
  },
  "Cord Sponsor": {
    lead: "Will you join us as our",
    tail: "symbolizing the bond we are about to share?",
    category: "cord",
  },
  "Flower Girl": {
    lead: "Will you add a little more joy to our day as our",
    category: "floral",
  },
  "Ring Bearer": {
    lead: "Will you carry one of the most meaningful symbols of our day as our",
    category: "diamond",
  },
  "Bible Bearer": {
    lead: "Will you carry the words that will guide our marriage as our",
    category: "diamond",
  },
  "Coin Bearer": {
    lead: "Will you carry a symbol of the life we will build together as our",
    category: "diamond",
  },
  "Banner Bearer": {
    lead: "Will you help lead our celebration as our",
    category: "branch",
  },
};

export const photography = {
  proposalHero: {
    src: proposal1920,
    srcSet: `${proposal960} 960w, ${proposal1920} 1920w`,
    alt: "Cloyd and Cyrin in formal wedding attire",
    desktopPosition: "50% 42%",
    mobilePosition: "34% 42%",
  },
  acceptance: {
    src: acceptanceWide1920,
    srcSet: `${acceptanceWide960} 960w, ${acceptanceWide1920} 1920w`,
    mobileSrc: acceptanceClose1920,
    mobileSrcSet: `${acceptanceClose960} 960w, ${acceptanceClose1920} 1920w`,
    alt: "Cloyd and Cyrin walking hand in hand",
    desktopPosition: "45% 50%",
    mobilePosition: "50% 42%",
  },
  closing: {
    src: closing1920,
    srcSet: `${closing960} 960w, ${closing1920} 1920w`,
    alt: "Cloyd and Cyrin beneath a grand old tree",
    desktopPosition: "50% 48%",
    mobilePosition: "50% 44%",
  },
};
