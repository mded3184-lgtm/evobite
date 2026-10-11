import './style.css';
import { Sfx } from '@/audio/sfx';
import { Input } from '@/core/input';
import { Keyboard } from '@/core/keyboard';
import { GameLoop } from '@/core/loop';
import { CONFIG } from '@/config';
import { buySkin, recordRound, selectSkin } from '@/game/economy';
import type { Progress } from '@/game/economy';
import { Game } from '@/game/game';
import { detectLanguage, isLangCode, setLanguage, t } from '@/i18n';
import { branchName } from '@/i18n/gameText';
import { Renderer } from '@/render/renderer';
import { createPlatformSdk } from '@/sdk/crazygames';
import { loadProgress, saveProgress } from '@/sdk/storage';
import { must } from '@/ui/dom';
import { EvolutionPicker } from '@/ui/evolutionPicker';
import { Hud } from '@/ui/hud';
import { Lobby } from '@/ui/lobby';
import { DeathScreen, PauseScreen } from '@/ui/screens';

const MUTE_KEY = 'evobite.muted';
const LANG_KEY = 'evobite.lang';

async function boot(): Promise<void> {
  const sdk = createPlatformSdk();
  await sdk.init();
  setLanguage(detectLanguage(sdk.getItem(LANG_KEY), navigator.languages));

  const canvas = must<HTMLCanvasElement>('#game');
  const overlay = must('#overlay');

  const game = new Game();
  const renderer = new Renderer(canvas, game);
  const input = new Input(canvas);
  const keyboard = new Keyboard();
  const sfx = new Sfx(sdk.getItem(MUTE_KEY) === '1');
  let progress: Progress = loadProgress(sdk);
  game.playerSkin = progress.selectedSkin;
  const savedName = sdk.getItem('evobite.name') ?? '';

  const commitProgress = (next: Progress): void => {
    progress = next;
    game.playerSkin = progress.selectedSkin;
    saveProgress(sdk, progress);
    menu.render(progress);
  };

  // ---- pause / sound ------------------------------------------------------

  const toggleSound = (): void => {
    sfx.unlock();
    sfx.setMuted(!sfx.muted);
    sdk.setItem(MUTE_KEY, sfx.muted ? '1' : '0');
    hud.setSoundIcon(sfx.muted);
    pauseScreen.setSound(sfx.muted);
    sfx.click();
  };

  const setPaused = (paused: boolean): void => {
    if (picker.isOpen) return; // the evolution picker is already a pause
    const now = game.setPaused(paused);
    if (now === pauseScreen.isOpen) return;
    if (now) {
      pauseScreen.show();
      sfx.boost(false);
      sdk.gameplayStop();
    } else {
      pauseScreen.hide();
      sdk.gameplayStart();
    }
    sfx.click();
  };

  const hud = new Hud(overlay, game, {
    onPause: () => {
      setPaused(true);
    },
    onToggleSound: toggleSound,
  });
  const picker = new EvolutionPicker(overlay);

  // ---- rounds -------------------------------------------------------------

  const startRound = (): void => {
    game.startRound();
    renderer.snapToPlayer();
    menu.hide();
    death.hide();
    pauseScreen.hide();
    hud.show();
    sdk.gameplayStart();
  };

  let respawning = false;

  const toMenu = (): void => {
    death.hide();
    pauseScreen.hide();
    picker.close();
    hud.hide();
    sfx.boost(false);
    if (game.phase === 'playing') sdk.gameplayStop();
    game.setPaused(false);
    game.phase = 'menu';
    menu.show(progress);
  };

  const pauseScreen = new PauseScreen(overlay, {
    onResume: () => {
      setPaused(false);
    },
    onToggleSound: toggleSound,
    onQuit: toMenu,
  });

  const menu = new Lobby(
    overlay,
    {
      onPlay: (name) => {
        sfx.unlock();
        sfx.click();
        game.playerName = name;
        sdk.setItem('evobite.name', name);
        startRound();
      },
      onBuy: (skinId) => {
        sfx.unlock();
        const result = buySkin(progress, skinId);
        if (!result.ok) {
          sfx.deny();
          return false;
        }
        sfx.coin();
        sdk.happyTime();
        commitProgress(result.progress);
        return true;
      },
      onSelect: (skinId) => {
        sfx.unlock();
        sfx.click();
        commitProgress(selectSkin(progress, skinId));
      },
      onClick: () => {
        sfx.unlock();
        sfx.click();
      },
      onLanguage: (code) => {
        if (!isLangCode(code)) return;
        sdk.setItem(LANG_KEY, code);
        // Every screen is built once at boot, so a reload is the simplest correct re-render.
        // Progress, name, skin and sound settings are already saved.
        window.location.reload();
      },
    },
    savedName,
  );
  const death = new DeathScreen(overlay, {
    onRespawn: () => {
      // Clicks, Enter and held Space can all fire this; only the first one counts.
      if (respawning) return;
      respawning = true;
      sfx.unlock();
      sfx.suspend();
      void sdk.showMidgameAd().then(() => {
        respawning = false;
        sfx.resume();
        startRound();
      });
    },
    onMenu: toMenu,
  });

  hud.setSoundIcon(sfx.muted);
  pauseScreen.setSound(sfx.muted);

  keyboard.onPress(['Escape', 'KeyP'], () => {
    if (game.phase === 'playing') setPaused(!game.isPaused);
  });
  keyboard.onPress(['KeyM'], toggleSound);

  // ---- game events -> UI + sound -----------------------------------------

  game.world.events.on('orbEaten', ({ eater }) => {
    if (eater.kind === 'player') sfx.orb();
  });
  game.world.events.on('evolutionOffer', ({ creature, tier }) => {
    sfx.offer();
    picker.open(tier, creature.path, (id) => {
      game.chooseBranch(id);
      hud.announce(t('toast.evolved', { name: branchName(id) }), 'good');
      sfx.evolve();
      sdk.happyTime();
    });
  });
  game.world.events.on('creatureEaten', ({ eater, prey, revenge }) => {
    if (eater.kind !== 'player') return;
    hud.announce(
      revenge ? t('toast.revenge', { name: prey.name }) : t('toast.ate', { name: prey.name }),
      revenge ? 'good' : 'info',
    );
    if (revenge) {
      sfx.revenge();
      sdk.happyTime();
    } else {
      sfx.chomp();
    }
  });
  game.world.events.on('playerDied', ({ killer, stats }) => {
    picker.close();
    hud.hide();
    sfx.death();
    sdk.gameplayStop();
    commitProgress(recordRound(progress, stats, Game.completedFormKey(stats)));
    death.show(stats, killer.name, progress);
  });

  // ---- loop ---------------------------------------------------------------

  const loop = new GameLoop({
    update: (dt) => {
      const live = game.phase === 'playing' && !game.isChoosing && !game.isPaused;
      if (live) game.aimAt(renderer.screenToWorld(input.aimPoint));
      game.setBoost(live && (keyboard.isHeld('Space') || hud.boostHeld));

      game.update(dt);

      const boosting = game.playerBoosting;
      sfx.boost(boosting);
      const p = game.player;
      hud.setBoostState(boosting, p !== null && p.mass > CONFIG.boost.minMass);

      // Freeze camera drift and particles too while the world is frozen.
      renderer.update(game.isChoosing || game.isPaused ? 0 : dt);
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
    Object.assign(window, { evobite: game, evobiteRenderer: renderer });
  }

  // Leaving the tab opens the pause menu, so coming back never drops you into danger.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.phase === 'playing') setPaused(true);
      sfx.suspend();
      loop.stop();
    } else {
      sfx.resume();
      loop.start();
    }
  });
}

boot().catch((err: unknown) => {
  console.error('EvoBite failed to start', err);
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.textContent = t('error.start');
});
