insert into public.resorts (
  id, name, slug, state, region, latitude, longitude, elevation_ft, acres, trails,
  difficulty, ticket_estimate_usd, rental_estimate_usd, lodging_estimate_usd, image_url, highlights, pass_affiliations
) values
('stowe', 'Stowe Mountain Resort', 'stowe-mountain-resort', 'VT', 'northeast', 44.5297, -72.7798, 4395, 485, 116, '{"beginner":16,"intermediate":55,"expert":29}', 179, 62, 190, 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=900&q=80', array['Classic New England terrain','Strong intermediate network','Walkable village energy'], array['epic']),
('killington', 'Killington Resort', 'killington-resort', 'VT', 'northeast', 43.6260, -72.7967, 4241, 1509, 155, '{"beginner":28,"intermediate":33,"expert":39}', 169, 58, 165, 'https://images.unsplash.com/photo-1517859047452-8510bcf207fd?auto=format&fit=crop&w=900&q=80', array['Huge trail count','Long season','Good mixed-ability groups'], array['ikon']),
('whiteface', 'Whiteface Mountain', 'whiteface-mountain', 'NY', 'northeast', 44.3659, -73.9026, 4867, 299, 94, '{"beginner":20,"intermediate":43,"expert":37}', 124, 55, 150, 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?auto=format&fit=crop&w=900&q=80', array['Olympic legacy','Big vertical','Lake Placid trip pairing'], array['independent']),
('boyne-mountain', 'Boyne Mountain', 'boyne-mountain', 'MI', 'midwest', 45.1629, -84.9303, 1120, 415, 60, '{"beginner":29,"intermediate":41,"expert":30}', 115, 48, 135, 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=900&q=80', array['Midwest-friendly drive','Beginner progression','Lower trip cost'], array['ikon']),
('breckenridge', 'Breckenridge Ski Resort', 'breckenridge-ski-resort', 'CO', 'rockies', 39.4817, -106.0384, 12998, 2908, 187, '{"beginner":11,"intermediate":31,"expert":58}', 239, 72, 260, 'https://images.unsplash.com/photo-1615414047026-802692414b6d?auto=format&fit=crop&w=900&q=80', array['High alpine terrain','Strong town scene','Advanced bowls'], array['epic']),
('vail', 'Vail Mountain', 'vail-mountain', 'CO', 'rockies', 39.6061, -106.3550, 11570, 5317, 195, '{"beginner":18,"intermediate":29,"expert":53}', 259, 78, 310, 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=900&q=80', array['Back bowls','Destination resort polish','Massive terrain'], array['epic']),
('jackson-hole', 'Jackson Hole Mountain Resort', 'jackson-hole-mountain-resort', 'WY', 'rockies', 43.5875, -110.8279, 10450, 2500, 131, '{"beginner":10,"intermediate":40,"expert":50}', 215, 70, 285, 'https://images.unsplash.com/photo-1518602164578-cd0074062767?auto=format&fit=crop&w=900&q=80', array['Steep expert terrain','Big snow years','Iconic tram'], array['ikon']),
('park-city', 'Park City Mountain', 'park-city-mountain', 'UT', 'west', 40.6514, -111.5080, 10026, 7300, 330, '{"beginner":8,"intermediate":42,"expert":50}', 229, 75, 275, 'https://images.unsplash.com/photo-1529701870190-9ae4010fd124?auto=format&fit=crop&w=900&q=80', array['Huge connected terrain','Easy airport access','Town-first trip'], array['epic']),
('palisades-tahoe', 'Palisades Tahoe', 'palisades-tahoe', 'CA', 'pacific', 39.1969, -120.2357, 9050, 6000, 270, '{"beginner":25,"intermediate":45,"expert":30}', 229, 74, 260, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80', array['Tahoe views','Olympic terrain','Large mixed-ability footprint'], array['ikon']),
('mt-bachelor', 'Mt. Bachelor', 'mt-bachelor', 'OR', 'pacific', 43.9794, -121.6886, 9065, 4323, 121, '{"beginner":15,"intermediate":35,"expert":50}', 159, 58, 170, 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=900&q=80', array['Volcanic summit laps','Bend basecamp','Good value for scale'], array['ikon'])
on conflict (id) do update set
  name = excluded.name,
  pass_affiliations = excluded.pass_affiliations;

insert into public.resort_conditions (resort_id, snowfall_7_day_in, base_depth_in, temperature_f, source)
values
('stowe', 8, 36, 24, 'seed'),
('killington', 6, 32, 27, 'seed'),
('whiteface', 5, 29, 21, 'seed'),
('boyne-mountain', 7, 25, 19, 'seed'),
('breckenridge', 14, 54, 17, 'seed'),
('vail', 12, 51, 18, 'seed'),
('jackson-hole', 18, 66, 14, 'seed'),
('park-city', 16, 58, 20, 'seed'),
('palisades-tahoe', 11, 48, 26, 'seed'),
('mt-bachelor', 13, 52, 23, 'seed');
