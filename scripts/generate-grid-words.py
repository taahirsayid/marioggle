"""Generate apps/server/data/grid-words.json from fallback + common English words."""
import json
import os

COMMON = """
about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert
alike alive allow alone along alter among angel anger angle angry apart apple apply arena argue
arise array aside asset audio audit avoid award aware badly bases basic basis beach began begin
begun being below bench birth black blame blank blind block blood board boost booth bound brain
brand bread break breed brief bring broad broke brown build built buyer cable carry catch cause
chain chair chart chase cheap check chest chief child chose civil claim class clean clear click
clock close coach coast could count court cover craft crash cream crime cross crowd crown curve
cycle daily dance dated dealt death debut delay depth doing doubt dozen draft drama drawn dream
dress drill drink drive drove dying eager early earth eight elite empty enemy enjoy enter entry
error event every exact exist extra faith false fault field fifth fifty fight final first fixed
flash fleet floor fluid focus force forth forty forum found frame frank fraud fresh front fruit
fully funny giant given glass going grace grade grand grant grass great green gross group grown
guard guess guest guide happy heart heavy hence horse hotel house human ideal image index inner
input issue judge known label large later laugh layer learn lease least leave legal level light
limit links lives local logic loose lower lucky lunch lying magic major maker march match maybe
mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth
movie music needs never newly night noise north noted novel nurse occur ocean offer often order
other ought paint panel paper party peace phase phone photo piece pilot pitch place plain plane
plant plate point pound power press price pride prime print prior prize proof proud prove queen
quick quiet radio raise range rapid ratio reach ready refer right rival river rough round route
royal rural scale scene scope score sense serve seven shall shape share sharp sheet shelf shell
shift shirt shock shoot short shown sight since sixth sixty sized skill sleep slide small smart
smile smoke solid solve sorry sound south space spare speak speed spend spent split spoke sport
staff stage stake stand start state steam steel stick still stock stone stood store storm story
strip stuck study stuff style sugar suite super sweet table taken taste teach teeth thank theft
their theme there these thick thing think third those three threw throw tight times title today
topic total touch tough tower track trade treat trend trial tribe trick tried troop truck truly
trust truth twice under undue union unity until upper upset urban usage usual valid value video
visit vital voice waste watch water wheel where which while white whole whose woman women world
worry worse worst worth would wound write wrong wrote yield young youth
""".split()

FALLBACK_PATH = os.path.join(os.path.dirname(__file__), '..', 'apps', 'server', 'data', 'dictionary.fallback.json')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'apps', 'server', 'data', 'grid-words.json')

words = set(w.lower() for w in COMMON if len(w) >= 3 and w.isalpha())
if os.path.exists(FALLBACK_PATH):
    with open(FALLBACK_PATH) as f:
        data = json.load(f)
        words.update(w.lower() for w in data.get('words', []))

payload = {'words': sorted(words), 'offensive': [], 'source': 'grid'}
with open(OUT_PATH, 'w') as f:
    json.dump(payload, f)
print(f'Wrote {len(words)} words to {OUT_PATH}')
