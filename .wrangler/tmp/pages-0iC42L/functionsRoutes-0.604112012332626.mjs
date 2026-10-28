import { onRequestGet as __api_leaderboard_ts_onRequestGet } from "/Users/tonny/agy/neon-survivor/functions/api/leaderboard.ts"
import { onRequestPost as __api_leaderboard_ts_onRequestPost } from "/Users/tonny/agy/neon-survivor/functions/api/leaderboard.ts"

export const routes = [
    {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequestGet],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequestPost],
    },
  ]