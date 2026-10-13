/** Which portal this bundle is built for; set from the Vite mode in vite.config.ts. */
declare const __PLATFORM__: 'crazygames' | 'gamedistribution' | 'web';
/** GameDistribution game id, from the GD_GAME_ID environment variable at build time. */
declare const __GD_GAME_ID__: string;
