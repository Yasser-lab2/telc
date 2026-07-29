export function AudioPlayer({ src }: { src: string }) {
  return (
    <audio className="w-full" controls preload="metadata">
      <source src={src} />
      Votre navigateur ne supporte pas l'audio HTML5.
    </audio>
  );
}
