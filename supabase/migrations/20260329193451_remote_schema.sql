


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."entity_freshness" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_key" "text" NOT NULL,
    "last_fetched_at" timestamp with time zone,
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "error" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_freshness" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_positions" (
    "player_id" bigint NOT NULL,
    "position_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_stats" (
    "id" bigint NOT NULL,
    "player_id" bigint,
    "team_id" bigint,
    "tournament_id" bigint,
    "season_id" bigint,
    "rating" double precision,
    "goals" integer,
    "assists" integer,
    "goals_assists_sum" integer,
    "minutes_played" integer,
    "matches_started" integer,
    "totw_appearances" integer,
    "total_passes" integer,
    "accurate_passes" integer,
    "inaccurate_passes" integer,
    "accurate_passes_percentage" double precision,
    "accurate_own_half_passes" integer,
    "total_own_half_passes" integer,
    "accurate_opposition_half_passes" integer,
    "total_opposition_half_passes" integer,
    "accurate_final_third_passes" integer,
    "key_passes" integer,
    "total_chipped_passes" integer,
    "accurate_chipped_passes" integer,
    "accurate_long_balls" integer,
    "total_long_balls" integer,
    "accurate_long_balls_percentage" double precision,
    "pass_to_assist" integer,
    "total_cross" integer,
    "accurate_crosses" integer,
    "accurate_crosses_percentage" double precision,
    "crosses_not_claimed" integer,
    "touches" integer,
    "successful_dribbles" integer,
    "successful_dribbles_percentage" double precision,
    "dribbled_past" integer,
    "dispossessed" integer,
    "possession_lost" integer,
    "possession_won_att_third" integer,
    "ball_recovery" integer,
    "big_chances_created" integer,
    "big_chances_missed" integer,
    "total_shots" integer,
    "shots_on_target" integer,
    "shots_off_target" integer,
    "blocked_shots" integer,
    "goal_conversion_percentage" double precision,
    "scoring_frequency" double precision,
    "goals_from_inside_the_box" integer,
    "goals_from_outside_the_box" integer,
    "shots_from_inside_the_box" integer,
    "shots_from_outside_the_box" integer,
    "headed_goals" integer,
    "left_foot_goals" integer,
    "right_foot_goals" integer,
    "hit_woodwork" integer,
    "tackles" integer,
    "tackles_won" integer,
    "tackles_won_percentage" double precision,
    "interceptions" integer,
    "clearances" integer,
    "error_lead_to_goal" integer,
    "error_lead_to_shot" integer,
    "own_goals" integer,
    "total_contest" integer,
    "total_duels_won" integer,
    "total_duels_won_percentage" double precision,
    "ground_duels_won" integer,
    "ground_duels_won_percentage" double precision,
    "aerial_duels_won" integer,
    "aerial_duels_won_percentage" double precision,
    "duel_lost" integer,
    "aerial_lost" integer,
    "penalties_taken" integer,
    "penalty_goals" integer,
    "penalty_won" integer,
    "penalty_conceded" integer,
    "penalty_conversion" double precision,
    "set_piece_conversion" double precision,
    "shot_from_set_piece" integer,
    "free_kick_goal" integer,
    "attempt_penalty_miss" integer,
    "attempt_penalty_post" integer,
    "attempt_penalty_target" integer,
    "saves" integer,
    "clean_sheet" integer,
    "goal_kicks" integer,
    "punches" integer,
    "runs_out" integer,
    "successful_runs_out" integer,
    "high_claims" integer,
    "saves_caught" integer,
    "saves_parried" integer,
    "saved_shots_from_inside_the_box" integer,
    "saved_shots_from_outside_the_box" integer,
    "goals_conceded" integer,
    "goals_conceded_inside_the_box" integer,
    "goals_conceded_outside_the_box" integer,
    "penalty_faced" integer,
    "penalty_save" integer,
    "fouls" integer,
    "was_fouled" integer,
    "yellow_cards" integer,
    "red_cards" integer,
    "direct_red_cards" integer,
    "yellow_red_cards" integer,
    "offsides" integer,
    "total_attempt_assist" integer,
    "appearances" integer,
    "count_rating" integer,
    "total_rating" double precision,
    "has_stats" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."player_stats" OWNER TO "postgres";


ALTER TABLE "public"."player_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."player_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" bigint NOT NULL,
    "api_id" bigint,
    "name" "text",
    "team_id" bigint,
    "jersey_num" "text",
    "height" bigint,
    "date_of_birth" "text",
    "foot" "text",
    "nationality" "text",
    "contract" "text",
    "image" "text",
    "market_value" bigint,
    "market_value_currency" "text"
);


ALTER TABLE "public"."players" OWNER TO "postgres";


ALTER TABLE "public"."players" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" bigint NOT NULL,
    "position" "text"
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


ALTER TABLE "public"."positions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."positions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" bigint NOT NULL,
    "api_id" bigint,
    "name" "text",
    "year" "text",
    "tournament_id" bigint,
    "is_current" boolean
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


ALTER TABLE "public"."seasons" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."seasons_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."standings" (
    "id" bigint NOT NULL,
    "api_id" bigint,
    "team_id" bigint,
    "tournament_id" bigint,
    "season_id" bigint,
    "position" bigint,
    "matches" bigint,
    "wins" bigint,
    "draws" bigint,
    "losses" bigint,
    "goals_for" bigint,
    "goals_against" bigint,
    "goal_diff" bigint,
    "points" bigint
);


ALTER TABLE "public"."standings" OWNER TO "postgres";


ALTER TABLE "public"."standings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."standings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."team_stats" (
    "id" bigint NOT NULL,
    "team_id" bigint,
    "tournament_id" bigint,
    "season_id" bigint,
    "matches" bigint,
    "goals_scored" bigint,
    "assists" bigint,
    "shots" bigint,
    "goalspershot_ratio" double precision,
    "penalty_scored" bigint,
    "penalty_taken" bigint,
    "penalty_ratio" double precision,
    "freekick_goals" bigint,
    "freekick_taken" bigint,
    "freekick_ratio" double precision,
    "goals_inside_box" bigint,
    "shots_inside_box" bigint,
    "goals_inside_ratio" double precision,
    "shots_inside_ratio" double precision,
    "goals_outside_box" bigint,
    "shots_outside_box" bigint,
    "goals_outside_ratio" double precision,
    "shots_outside_ratio" double precision,
    "goals_header" bigint,
    "goals_header_ratio" double precision,
    "shots_ontarget" bigint,
    "shots_ontarget_ratio" double precision,
    "shots_offtarget" bigint,
    "shots_blocked" bigint,
    "woodwork" bigint,
    "big_chances" bigint,
    "big_chances_created" bigint,
    "big_chances_missed" bigint,
    "big_chances_goal_ratio" double precision,
    "dribbles_success" bigint,
    "dribbles_attempts" bigint,
    "dribbles_success_ratio" double precision,
    "corners" bigint,
    "fastbreak_total" bigint,
    "fastbreak_goals" bigint,
    "fastbreak_shots" bigint,
    "fastbreak_ratio" double precision,
    "avg_ball_possession" double precision,
    "pass_total" bigint,
    "pass_acc" bigint,
    "pass_acc_percentage" double precision,
    "pass_ownhalf_total" bigint,
    "pass_ownhalf_acc" bigint,
    "pass_ownhalf_perc" double precision,
    "pass_opphalf_total" bigint,
    "pass_opphalf_acc" bigint,
    "pass_opphalf_perc" double precision,
    "longballs_total" bigint,
    "longballs_acc" bigint,
    "longballs_perc" double precision,
    "cross_total" bigint,
    "cross_acc" bigint,
    "cross_perc" double precision,
    "cleansheats" bigint,
    "tackles" bigint,
    "interceptions" bigint,
    "saves" bigint,
    "clearences" bigint,
    "clearences_offline" bigint,
    "lastman_tackles" bigint,
    "errors_to_goals" bigint,
    "errors_to_shot" bigint,
    "penalty_commited" bigint,
    "penalty_conceded" bigint,
    "duels_total" bigint,
    "duels_won" bigint,
    "duels_perc" double precision,
    "ground_duels_total" bigint,
    "ground_duels_won" bigint,
    "ground_duels_perc" double precision,
    "aerial_duels_total" bigint,
    "aerial_duels_won" bigint,
    "aerial_duels_perc" double precision,
    "possession_lost" bigint,
    "offsides" bigint,
    "fouls" bigint,
    "yellowcards" bigint,
    "yellowcards_second" bigint,
    "redcards" bigint,
    "own_goals" bigint,
    "goals_conceded" bigint,
    "shots_against" bigint,
    "shots_blocked_against" bigint,
    "shots_inside_against" bigint,
    "shots_outside_against" bigint,
    "shots_ontarget_against" bigint,
    "shots_offtarget_against" bigint,
    "woodwork_against" bigint,
    "goalspershot_against_ratio" double precision,
    "shots_ontarget_against_ratio" double precision,
    "big_chances_against" bigint,
    "big_chances_against_created" bigint,
    "big_chances_against_missed" bigint,
    "big_chances_goal_against_ratio" double precision,
    "errors_to_goals_against" bigint,
    "errors_to_shot_against" bigint,
    "pass_against_total" bigint,
    "pass_against_acc" bigint,
    "pass_against_ratio" double precision,
    "finalthirdpass_against_total" bigint,
    "finalthirdpass_against_acc" bigint,
    "finalthirdpass_against_ratio" double precision,
    "opphalfpass_against_total" bigint,
    "opphalfpass_against_acc" bigint,
    "opphalfpass_against_ratio" double precision,
    "ownhalfpass_against_total" bigint,
    "ownhalfpass_against_acc" bigint,
    "ownhalfpass_against_ratio" double precision,
    "keypass_against" bigint,
    "longballs_against_total" bigint,
    "longballs_against_acc" bigint,
    "longballs_against_ratio" double precision,
    "cross_against_total" bigint,
    "cross_against_acc" bigint,
    "cross_against_ratio" double precision,
    "dribbles_against_total" bigint,
    "dribbles_against_acc" bigint,
    "dribbles_against_ratio" double precision,
    "tackles_against" bigint,
    "clearences_against" bigint,
    "interceptions_against" bigint,
    "corners_against" bigint,
    "offsides_against" bigint,
    "yellowcards_against" bigint,
    "redcards_against" bigint,
    "has_stats" boolean
);


ALTER TABLE "public"."team_stats" OWNER TO "postgres";


ALTER TABLE "public"."team_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."team_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint NOT NULL,
    "api_id" bigint NOT NULL,
    "name" "text",
    "tournament_id" bigint,
    "city" "text",
    "stadium" "text",
    "logo_url" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE "public"."teams" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."teams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" bigint NOT NULL,
    "api_id" bigint NOT NULL,
    "name" "text",
    "country" "text",
    "flag_code" "text",
    "logo_md5" "text",
    "logo_id" bigint
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


ALTER TABLE "public"."tournaments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tournaments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."entity_freshness"
    ADD CONSTRAINT "entity_freshness_entity_type_entity_key_key" UNIQUE ("entity_type", "entity_key");



ALTER TABLE ONLY "public"."entity_freshness"
    ADD CONSTRAINT "entity_freshness_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_pkey" PRIMARY KEY ("player_id", "position_id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_player_team_season_tournament_uniq" UNIQUE ("player_id", "team_id", "season_id", "tournament_id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_player_team_tourn_season_uniq" UNIQUE ("player_id", "team_id", "tournament_id", "season_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_api_id_unique" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_position_unique" UNIQUE ("position");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_stats"
    ADD CONSTRAINT "team_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_stats"
    ADD CONSTRAINT "team_stats_unique_key" UNIQUE ("team_id", "season_id", "tournament_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_entity_freshness_lookup" ON "public"."entity_freshness" USING "btree" ("entity_type", "entity_key");



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read access" ON "public"."players" FOR SELECT USING (true);



ALTER TABLE "public"."entity_freshness" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";










































































































































































































































































































































































































































































































































GRANT ALL ON TABLE "public"."entity_freshness" TO "anon";
GRANT ALL ON TABLE "public"."entity_freshness" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_freshness" TO "service_role";



GRANT ALL ON TABLE "public"."player_positions" TO "anon";
GRANT ALL ON TABLE "public"."player_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."player_positions" TO "service_role";



GRANT ALL ON TABLE "public"."player_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."positions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."standings" TO "anon";
GRANT ALL ON TABLE "public"."standings" TO "authenticated";
GRANT ALL ON TABLE "public"."standings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."standings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."standings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."standings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_stats" TO "anon";
GRANT ALL ON TABLE "public"."team_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."team_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


