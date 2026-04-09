export interface AvatarDef {
  id: number;
  src: string;
  label: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 1, src: '/avatars/dinosaur.svg', label: 'Dinosaur' },
  { id: 2, src: '/avatars/phoenix.svg', label: 'Phoenix' },
  { id: 3, src: '/avatars/kraken.svg', label: 'Kraken' },
  { id: 4, src: '/avatars/ghost.svg', label: 'Ghost' },
  { id: 5, src: '/avatars/robot.svg', label: 'Robot' },
  { id: 6, src: '/avatars/alien.svg', label: 'Alien' },
  { id: 7, src: '/avatars/yeti.svg', label: 'Yeti' },
  { id: 8, src: '/avatars/ninja.svg', label: 'Ninja' },
  { id: 9, src: '/avatars/samurai.svg', label: 'Samurai' },
  { id: 10, src: '/avatars/wolf.svg', label: 'Wolf' },
  { id: 11, src: '/avatars/dragon.svg', label: 'Dragon' },
  { id: 12, src: '/avatars/serpent.svg', label: 'Serpent' },
  { id: 13, src: '/avatars/golem.svg', label: 'Golem' },
  { id: 14, src: '/avatars/cyborg.svg', label: 'Cyborg' },
  { id: 15, src: '/avatars/sphinx.svg', label: 'Sphinx' },
  { id: 16, src: '/avatars/griffin.svg', label: 'Griffin' },
  { id: 17, src: '/avatars/wraith.svg', label: 'Wraith' },
  { id: 18, src: '/avatars/mantis.svg', label: 'Mantis' },
  { id: 19, src: '/avatars/scorpion.svg', label: 'Scorpion' },
  { id: 20, src: '/avatars/chimera.svg', label: 'Chimera' },
];

export const getAvatar = (id: number): AvatarDef => AVATARS.find(a => a.id === id) || AVATARS[0];
