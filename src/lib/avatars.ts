export interface AvatarDef {
  id: number;
  src: string;
  label: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 1, src: '/avatars/dragon.png', label: 'Dragon' },
  { id: 2, src: '/avatars/dinosaur.png', label: 'Dinosaur' },
  { id: 3, src: '/avatars/phoenix.png', label: 'Phoenix' },
  { id: 4, src: '/avatars/robot.png', label: 'Robot' },
  { id: 5, src: '/avatars/ghost.png', label: 'Ghost' },
  { id: 6, src: '/avatars/wolf.png', label: 'Wolf' },
  { id: 7, src: '/avatars/alien.png', label: 'Alien' },
  { id: 8, src: '/avatars/ninja.png', label: 'Ninja' },
  { id: 9, src: '/avatars/samurai.png', label: 'Samurai' },
  { id: 10, src: '/avatars/kraken.png', label: 'Kraken' },
  { id: 11, src: '/avatars/yeti.png', label: 'Yeti' },
  { id: 12, src: '/avatars/cyborg.png', label: 'Cyborg' },
  { id: 13, src: '/avatars/griffin.png', label: 'Griffin' },
  { id: 14, src: '/avatars/golem.png', label: 'Golem' },
  { id: 15, src: '/avatars/serpent.png', label: 'Serpent' },
  { id: 16, src: '/avatars/sphinx.png', label: 'Sphinx' },
  { id: 17, src: '/avatars/wraith.png', label: 'Wraith' },
  { id: 18, src: '/avatars/mantis.png', label: 'Mantis' },
  { id: 19, src: '/avatars/scorpion.png', label: 'Scorpion' },
  { id: 20, src: '/avatars/chimera.png', label: 'Chimera' },
];

export const getAvatar = (id: number): AvatarDef => AVATARS.find(a => a.id === id) || AVATARS[0];
