
update public.homepage_sections set config = '{"items":[
 {"title":"Established Since 2002","copy":"More than two decades of trusted service and craftsmanship — a family business built on word of mouth."},
 {"title":"Premium Materials","copy":"Solid hardwoods, hand-selected fabrics, and durable finishes built to last for generations."},
 {"title":"Custom Furniture","copy":"Tell us your size, fabric, and finish — our workshop builds it to fit your home."},
 {"title":"Delivery & Installation","copy":"On-time white-glove delivery, in-room placement, and assembly handled by our own team."}
]}'::jsonb where section_type = 'trust';

update public.homepage_sections set title = 'Made to your measurements',
 subtitle = 'Any piece in the showroom can be built to your size, fabric, and finish. Send us a photo of your space and we will suggest the right proportions.',
 config = '{"button_text":"Enquire on WhatsApp","button_link":"whatsapp"}'::jsonb
 where section_type = 'promo';
