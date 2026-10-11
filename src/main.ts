import './style.css';
import { GameLoop } from '@/core/loop';
import { Input } from '@/core/input';
import { Game } from '@/game/game';
import { recordRound } from '@/game/economy';
import type { Progress } from '@/game/economy';
import { BRANCHES } from '@/game/evolution/tree';
import { Renderer } from '@/render/renderer';
import { createPlatformSdk } from '@/sdk/crazygames';
import { loadProgress, saveProgress } from '@/sdk/storage';
import { must } from '@/ui/dom';
import { EvolutionPicker } from '@/ui/evolutionPicker';
import { Hud } from '@/ui/hud';
import { DeathScreen, MenuScreen } from '@/ui/screens';

async function boot(): Promise<void> {
  const sdk = createPlatformSdk();
  await sdk.init();

  const canvas = must<HTMLCanvasElement>('#game');
  const overlay = must('#overlay');

  const game = new Game();
  const renderer = new Renderer(canvas, game);
  const input = new Input(canvas);
  const hud = new Hud(overlay, game);
  const picker = new EvolutionPicker(overlay);
  let progress: Progress = loadProgress(sdk);
  const savedName = sdk.getItem('evobite.name') ?? '';

  const startRound = (): void => {
    game.startRound();
    renderer.snapToPlayer();
    menu.hide();
    death.hide();
    hud.show();
    sdk.gameplayStart();
  };

  const menu = new MenuScreen(
    overlay,
    {
      onPlay: (name) => {
        game.playerName = name;
        sdk.setItem('evobite.name', name);
        startRound();
      },
    },
    savedName,
  );
  const death = new DeathScreen(overlay, {
    onRespawn: () => {
      void sdk.showMidgameAd().then(startRound);
    },
    onMenu: () => {
      death.hide();
      hud.hide();
      game.phase = 'menu';
      menu.show(progress);
    },
  });

  game.world.events.on('evolutionOffer', ({ creature, tier }) => {
    picker.open(tier, creature.path, (id) => {
      game.chooseBranch(id);
      hud.announce(`Evolved: ${BRANCHES[id].name}`, 'good');
      sdk.happyTime();
    });
  });
  game.world.events.on('creatureEaten', ({ eater, prey, revenge }) => {
    if (eater.kind !== 'player') return;
    hud.announce(
      revenge ? `REVENGE on ${prey.name}!` : `Ate ${prey.name}`,
      revenge ? 'good' : 'info',
    );
    if (revenge) sdk.happyTime();
  });
  game.world.events.on('playerDied', ({ killer, stats }) => {
    picker.close();
    hud.hide();
    sdk.gameplayStop();
    progress = recordRound(progress, stats, Game.completedFormKey(stats));
    saveProgress(sdk, progress);
    death.show(stats, killer.name, progress);
  });

  const loop = new GameLoop({
    update: (dt) => {
      if (game.phase === 'playing' && !picker.isOpen) {
        game.aimAt(renderer.screenToWorld(input.aimPoint));
      }
      game.update(dt);
      // Freeze camera drift and particles too while the world is paused for a choice.
      renderer.update(game.isChoosing ? 0 : dt);
      hud.update(dt);
    },
    render: () => {
      renderer.draw();
    },
  });

  menu.show(progress);
  loop.start();

  // Dev-only handle for debugging and browser smoke tests; stripped from production builds.
  if (import.meta.env.DEV) {
    (window as unknown as { evobite: Game }).evobite = game;
  }

  // Pause the simulation when the tab is hidden so the player doesn't die off-screen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) loop.stop();
    else loop.start();
  });
}

boot().catch((err: unknown) => {
  console.error('EvoBite failed to start', err);
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.textContent = 'Failed to start. Please reload.';
});
