/**
 * Lecture de la timeline générée par tools/tts.py.
 * Tout ce qui est synchronisé (sous-titres, compteur, −1 €, bouches, plans) passe par ici.
 */
export type Word = {text: string; start: number; end: number; echo?: number};
export type Line = {
	id: string;
	who: string; // vo | leon | kevin | maire | echo | ...
	text: string;
	start: number;
	end: number;
	words: Word[];
	paid?: boolean;
	payer?: string;
	balanceBefore?: number;
	of?: string;
};
export type TimelineData = {duration: number; lines: Line[]};

export type CostEvent = {t: number; payer: string; lineId: string; who: string; echo?: number};

export class Timeline {
	readonly fps: number;
	readonly lines: Line[];
	readonly duration: number;
	readonly payerDefault: string;
	readonly startBalance: number;
	readonly costs: CostEvent[];
	private byId: Map<string, Line>;

	constructor(data: TimelineData, opts: {fps: number; payer: string; startBalance: number}) {
		this.fps = opts.fps;
		this.lines = data.lines;
		this.duration = data.duration;
		this.payerDefault = opts.payer;
		this.startBalance = opts.startBalance;
		this.byId = new Map(data.lines.map((l) => [l.id, l]));
		this.costs = [];
		for (const l of data.lines) {
			if (!l.paid) continue;
			const payer = l.payer ?? (l.who === 'echo' ? this.line(l.of!).payer ?? opts.payer : opts.payer);
			for (const w of l.words) {
				this.costs.push({t: w.start, payer, lineId: l.id, who: l.who, echo: w.echo});
			}
		}
	}

	get durationInFrames() {
		return Math.ceil(this.duration * this.fps);
	}

	line(id: string): Line {
		const l = this.byId.get(id);
		if (!l) throw new Error(`Réplique inconnue : ${id}`);
		return l;
	}

	/** Frame de début d'une réplique (+ décalage en secondes). */
	f(id: string, offsetSec = 0, edge: 'start' | 'end' = 'start'): number {
		const l = this.line(id);
		return Math.round(((edge === 'start' ? l.start : l.end) + offsetSec) * this.fps);
	}

	/** Frame d'un mot précis d'une réplique. */
	fw(id: string, wordIndex: number, edge: 'start' | 'end' = 'start'): number {
		const w = this.line(id).words[wordIndex];
		return Math.round((edge === 'start' ? w.start : w.end) * this.fps);
	}

	/** Solde du payeur principal à l'instant t (secondes). */
	balanceAt(t: number): number {
		let bal = this.startBalance;
		let lastOverride = -Infinity;
		for (const l of this.lines) {
			if (l.balanceBefore !== undefined && l.start - 0.05 <= t) {
				bal = l.balanceBefore;
				lastOverride = l.start - 0.05;
			}
		}
		for (const c of this.costs) {
			if (c.payer === this.payerDefault && c.t <= t && c.t >= lastOverride) bal -= 1;
		}
		return bal;
	}

	/** La bouche de ce personnage doit-elle bouger ? Renvoie 0..1. */
	mouthOpen(who: string, t: number): number {
		for (const l of this.lines) {
			if (l.who !== who) continue;
			if (t < l.start - 0.05 || t > l.end + 0.05) continue;
			for (const w of l.words) {
				if (t >= w.start - 0.03 && t <= w.end + 0.03) {
					const p = (t - w.start) / Math.max(0.08, w.end - w.start);
					// 2-3 syllabes par mot environ : oscillation douce
					return 0.35 + 0.65 * Math.abs(Math.sin(p * Math.PI * Math.max(1, Math.round((w.end - w.start) / 0.16))));
				}
			}
			return 0.15;
		}
		return 0;
	}

	/** Mots visibles pour les sous-titres. */
	allWords(): (Word & {lineId: string; who: string; paid: boolean})[] {
		return this.lines.flatMap((l) =>
			l.words.map((w) => ({...w, lineId: l.id, who: l.who, paid: !!l.paid})),
		);
	}
}
