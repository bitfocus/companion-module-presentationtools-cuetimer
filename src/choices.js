const MAX_LIST_CHOICES = 10

export function getListNumberedChoices(ctx, includePreviousAndNext = false) {
	const result = []

	if (ctx.config?.list === '' && includePreviousAndNext) {
		result.push({ id: 'Previous', label: 'Previous List' })
		result.push({ id: 'Next', label: 'Next List' })
	}

	for (let i = 1; i <= MAX_LIST_CHOICES; i++) {
		const title = ctx.lists?.[i - 1]?.title
		result.push({ id: String(i), label: title !== undefined ? `${i} - ${title}` : `${i} - ` })
	}

	return result
}

export function getListsChoices(lists) {
	const result = (lists ?? []).map((item, index) => ({
		id: item.guid,
		label: `${index + 1}- ${item.title}`,
	}))

	// Placeholders so a list can be chosen before the first telemetry arrives
	while (result.length < MAX_LIST_CHOICES) {
		const index = result.length + 1
		result.push({ id: String(index), label: `${index}- ` })
	}

	return result
}
