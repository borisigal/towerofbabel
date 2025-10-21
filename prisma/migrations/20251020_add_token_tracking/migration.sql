-- AddTokenTracking
ALTER TABLE "interpretations" ADD COLUMN "tokens_input" INTEGER;
ALTER TABLE "interpretations" ADD COLUMN "tokens_output" INTEGER;
ALTER TABLE "interpretations" ADD COLUMN "tokens_cached" INTEGER;
