-- Sample guided meditations
INSERT INTO guided_meditations (title, description, duration_minutes, audio_url, category, difficulty_level, instructor, is_premium) VALUES
('Morning Mindfulness', 'Start your day with clarity and purpose. This guided meditation will help you set positive intentions and cultivate awareness for the day ahead.', 10, '/audio/morning-mindfulness.mp3', 'focus', 'beginner', 'Sarah Chen', false),
('Stress Relief', 'Release tension and find your calm center. This meditation uses body scanning and breathing techniques to help you let go of stress.', 15, '/audio/stress-relief.mp3', 'stress', 'beginner', 'Michael Rivers', false),
('Deep Sleep Journey', 'Drift into peaceful slumber with this guided journey. Perfect for those struggling with sleep or wanting deeper rest.', 20, '/audio/deep-sleep.mp3', 'sleep', 'intermediate', 'Emma Thompson', true),
('Anxiety Relief', 'Find peace in the present moment. This meditation helps you work with anxious thoughts and feelings with compassion.', 12, '/audio/anxiety-relief.mp3', 'anxiety', 'beginner', 'David Kim', false),
('Gratitude Practice', 'Cultivate appreciation and joy in your life. This meditation guides you through reflecting on what you''re grateful for.', 8, '/audio/gratitude.mp3', 'gratitude', 'beginner', 'Lisa Martinez', false),
('Focus & Productivity', 'Sharpen your mind and enhance concentration. Perfect before important work or study sessions.', 15, '/audio/focus-productivity.mp3', 'focus', 'intermediate', 'James Wilson', true),
('Loving Kindness', 'Open your heart with this traditional loving-kindness meditation. Send compassion to yourself and others.', 20, '/audio/loving-kindness.mp3', 'loving-kindness', 'intermediate', 'Maya Patel', false),
('Body Scan Relaxation', 'Progressive relaxation through systematic body awareness. Release tension from head to toe.', 25, '/audio/body-scan.mp3', 'body-scan', 'beginner', 'Robert Johnson', true),
('Self-Esteem Boost', 'Build confidence and self-worth through positive affirmations and visualization.', 12, '/audio/self-esteem.mp3', 'self-esteem', 'beginner', 'Jennifer Lee', false),
('Relationship Harmony', 'Cultivate healthier relationships through mindfulness and compassion practices.', 18, '/audio/relationships.mp3', 'relationships', 'intermediate', 'Carlos Rodriguez', true);

-- Sample breathing exercises
INSERT INTO breathing_exercises (name, description, inhale_duration, hold_duration, exhale_duration, pause_duration, cycles, difficulty_level, benefits) VALUES
('Box Breathing', 'Equal parts inhale, hold, exhale, pause. Used by Navy SEALs for focus and calm.', 4, 4, 4, 4, 8, 'beginner', ARRAY['Reduces stress', 'Improves focus', 'Calms anxiety']),
('4-7-8 Breathing', 'Dr. Andrew Weil''s technique for sleep and relaxation. Inhale for 4, hold for 7, exhale for 8.', 4, 7, 8, NULL, 4, 'intermediate', ARRAY['Promotes sleep', 'Reduces anxiety', 'Lowers blood pressure']),
('Belly Breathing', 'Deep diaphragmatic breathing to activate the relaxation response.', 5, NULL, 5, NULL, 10, 'beginner', ARRAY['Relaxes body', 'Improves oxygen flow', 'Reduces tension']),
('Coherent Breathing', 'Balanced breathing at 5 seconds in, 5 seconds out for heart rate variability.', 5, NULL, 5, NULL, 12, 'beginner', ARRAY['Heart rate variability', 'Emotional balance', 'Energy boost']),
('Energizing Breath', 'Quick, rhythmic breathing to increase alertness and energy.', 2, NULL, 2, NULL, 20, 'intermediate', ARRAY['Increases energy', 'Improves alertness', 'Boosts mood']);

-- Sample sleep stories
INSERT INTO sleep_stories (title, description, narrator, duration_minutes, audio_url, category, is_premium) VALUES
('Moonlit Forest', 'Journey through a peaceful forest bathed in moonlight, where gentle creatures guide you to rest.', 'Emma Thompson', 30, '/audio/moonlit-forest.mp3', 'nature', false),
('Ocean Waves', 'Let the rhythmic sound of ocean waves carry you to a place of deep tranquility.', 'Nature Sounds', 60, '/audio/ocean-waves.mp3', 'nature', false),
('Starry Night Journey', 'Float among the stars on a magical journey through the cosmos.', 'Michael Rivers', 45, '/audio/starry-night.mp3', 'fantasy', true),
('Rain on Leaves', 'The gentle patter of rain on leaves creates a soothing symphony for sleep.', 'Nature Sounds', 90, '/audio/rain-leaves.mp3', 'nature', false),
('Dream Piano', 'Soft, melodic piano pieces to lull you into peaceful dreams.', 'Classical Collection', 40, '/audio/dream-piano.mp3', 'fiction', false),
('Mountain Retreat', 'Escape to a cozy mountain cabin where warmth and comfort await.', 'Sarah Chen', 35, '/audio/mountain-retreat.mp3', 'travel', true),
('Enchanted Garden', 'Wander through a magical garden where flowers sing lullabies.', 'Lisa Martinez', 50, '/audio/enchanted-garden.mp3', 'fantasy', true),
('Desert Oasis', 'Find peace in a tranquil desert oasis under a blanket of stars.', 'David Kim', 40, '/audio/desert-oasis.mp3', 'travel', false);

-- Sample meditation programs
INSERT INTO meditation_programs (title, description, duration_days, difficulty_level) VALUES
('7-Day Beginner''s Journey', 'Start your meditation practice with this gentle introduction to mindfulness.', 7, 'beginner'),
('21-Day Stress Reduction', 'A comprehensive program to help you manage and reduce stress in your daily life.', 21, 'intermediate'),
('30-Day Mindfulness Challenge', 'Deepen your practice with daily meditations exploring different aspects of mindfulness.', 30, 'intermediate'),
('14-Day Sleep Better', 'Improve your sleep quality with targeted meditations and relaxation techniques.', 14, 'beginner'),
('10-Day Focus Intensive', 'Sharpen your concentration and mental clarity with focused attention practices.', 10, 'advanced');

-- Sample daily quotes
INSERT INTO daily_quotes (text, author, date) VALUES
('The present moment is the only time over which we have dominion.', 'Thích Nhất Hạnh', CURRENT_DATE),
('Meditation is not evasion; it is a serene encounter with reality.', 'Thích Nhất Hạnh', CURRENT_DATE + INTERVAL '1 day'),
('The mind is everything. What you think you become.', 'Buddha', CURRENT_DATE + INTERVAL '2 days'),
('Peace comes from within. Do not seek it without.', 'Buddha', CURRENT_DATE + INTERVAL '3 days'),
('The best way to take care of the future is to take care of the present moment.', 'Thích Nhất Hạnh', CURRENT_DATE + INTERVAL '4 days'),
('Wherever you are, be there totally.', 'Eckhart Tolle', CURRENT_DATE + INTERVAL '5 days'),
('The only way to live is by accepting each minute as an unrepeatable miracle.', 'Tara Brach', CURRENT_DATE + INTERVAL '6 days');
