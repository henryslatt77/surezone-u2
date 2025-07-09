export function calculateArbitrage(bookmakers) {
  // Helper function to safely parse numbers
  const safeParseFloat = (value) => {
    if (value === "" || value === null || value === undefined) {
      return 0
    }
    const parsed = Number.parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  // Convert lay odds to back odds equivalent
  const convertLayToBack = (layOdd) => {
    const layValue = safeParseFloat(layOdd)
    if (layValue <= 1) return 0
    return layValue / (layValue - 1)
  }

  // Extract final odds with safety checks and convert lay odds
  const odds = bookmakers.map((bm) => {
    const finalOdd = safeParseFloat(bm.finalOdd)
    if (finalOdd <= 0) return 0

    // Convert lay odds to back odds equivalent for calculations
    if (bm.isLayBet) {
      return convertLayToBack(finalOdd)
    }
    return finalOdd
  })

  // Ensure all odds are valid before calculating
  if (odds.some((odd) => odd <= 0)) {
    return {
      arbitragePercentage: 0,
      isArbitrage: false,
      totalInvestment: 0,
      distributedStakes: [],
      returns: [],
      profit: 0,
      profitPercentage: 0,
    }
  }

  // Calculate arbitrage percentage considering freebets, lay bets and commission
  const adjustedProbabilities = bookmakers.map((bm, index) => {
    const odd = odds[index] // Already converted if lay bet

    if (bm.isLayBet) {
      // For lay bets, we need to account for commission reducing our effective return
      const commissionRate = safeParseFloat(bm.commissionRate) / 100
      const effectiveReturn = 1 - commissionRate // What we actually keep after commission
      // Adjust the probability calculation to account for commission
      return 1 / (odd * effectiveReturn)
    } else if (bm.freebet) {
      // For freebets, the effective odd is (odd - 1) since we don't get the stake back
      return odd > 1 ? 1 / (odd - 1) : 1
    } else {
      // For normal back bets
      return 1 / odd
    }
  })

  const arbitragePercentage = adjustedProbabilities.reduce((sum, prob) => sum + prob, 0) * 100

  // Check if this is an arbitrage opportunity
  const isArbitrage = arbitragePercentage < 100

  // Find if there's a fixed stake
  const fixedBookmakerIndex = bookmakers.findIndex((bm) => bm.isStakeFixed)

  let totalInvestment = 0
  let distributedStakes = []

  if (fixedBookmakerIndex >= 0) {
    // If there's a fixed stake, calculate distribution based on it
    const fixedStake = safeParseFloat(bookmakers[fixedBookmakerIndex].stake)
    if (fixedStake > 0) {
      // LÓGICA: Considerar stakes manuais mesmo com casa fixada
      distributedStakes = distributeStakesWithFixedAndManual(bookmakers, fixedBookmakerIndex, fixedStake)

      // Calculate total investment - only liability for lay bets
      totalInvestment = distributedStakes.reduce((sum, stake, index) => {
        const bm = bookmakers[index]
        if (bm.isLayBet) {
          // For lay bets, investment is ONLY the liability (responsibility)
          const layOdd = safeParseFloat(bm.finalOdd)
          const liability = stake * (layOdd - 1)
          return sum + liability
        } else {
          // For back bets, investment is the stake
          return sum + stake
        }
      }, 0)

      // Arredondar o investimento total
      totalInvestment = Math.round(totalInvestment * 100) / 100
    }
  } else {
    // Check if there are manual stakes
    const hasManualStakes = bookmakers.some((bm) => bm.manualStake !== null && bm.manualStake !== undefined)

    if (hasManualStakes) {
      // Use manual stakes where available, calculate others
      distributedStakes = bookmakers.map((bm) => {
        if (bm.manualStake !== null && bm.manualStake !== undefined) {
          return safeParseFloat(bm.manualStake)
        }
        return 0 // Will be calculated if needed
      })

      // Calculate total investment with manual stakes
      totalInvestment = distributedStakes.reduce((sum, stake, index) => {
        const bm = bookmakers[index]
        if (bm.isLayBet) {
          const layOdd = safeParseFloat(bm.finalOdd)
          const liability = stake * (layOdd - 1)
          return sum + liability
        } else {
          return sum + stake
        }
      }, 0)
    } else {
      // Default calculation when no stake is fixed and no manual stakes
      totalInvestment = 100

      // Calculate stakes with new lay logic
      distributedStakes = calculateStakesWithNewLayLogic(bookmakers, totalInvestment)

      // Recalculate total investment - only liability for lay bets
      totalInvestment = distributedStakes.reduce((sum, stake, index) => {
        const bm = bookmakers[index]
        if (bm.isLayBet) {
          // For lay bets, investment is ONLY the liability
          const layOdd = safeParseFloat(bm.finalOdd)
          const liability = stake * (layOdd - 1)
          return sum + liability
        } else {
          // For back bets, investment is the stake
          return sum + stake
        }
      }, 0)
    }

    totalInvestment = Math.round(totalInvestment * 100) / 100
  }

  // Calculate net result for each scenario - CORRECTED LOGIC
  const returns = bookmakers.map((_, winningIndex) => {
    let totalReturn = 0

    bookmakers.forEach((bm, index) => {
      const stake = distributedStakes[index] || 0

      if (index === winningIndex) {
        // This bookmaker wins
        if (bm.isLayBet) {
          // Lay wins: we receive the stake + we don't pay the liability
          const commissionRate = safeParseFloat(bm.commissionRate) / 100
          const grossProfit = stake
          const commission = grossProfit * commissionRate
          const layOdd = safeParseFloat(bm.finalOdd)
          const liability = stake * (layOdd - 1)

          // Total return = stake received + liability not paid - commission
          totalReturn = grossProfit + liability - commission
        } else if (bm.freebet) {
          // Freebet wins: we receive only the profit
          const finalOdd = safeParseFloat(bm.finalOdd)
          totalReturn = stake * (finalOdd - 1)
        } else {
          // Normal back wins: we receive stake × odd
          const finalOdd = safeParseFloat(bm.finalOdd)
          totalReturn = stake * finalOdd
        }
      }
    })

    // Calculate the profit by subtracting total investment
    const profit = totalReturn - totalInvestment
    return isNaN(profit) ? 0 : Math.round(profit * 100) / 100
  })

  // Calculate absolute profit - The profit is simply the net result (already accounts for investment)
  let profit = 0

  if (returns.length > 0) {
    // In a perfect arbitrage, all returns should be equal
    // The profit is the consistent result across all scenarios
    const minReturn = Math.min(...returns)
    profit = minReturn
  }

  // Arredondar o lucro para 2 casas decimais
  profit = Math.round(profit * 100) / 100

  // Calculate profit percentage based on total investment
  const profitPercentage = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0

  return {
    arbitragePercentage: isNaN(arbitragePercentage) ? 0 : Math.round(arbitragePercentage * 100) / 100,
    isArbitrage,
    totalInvestment: isNaN(totalInvestment) ? 0 : totalInvestment,
    distributedStakes: distributedStakes.map((stake) => (isNaN(stake) ? 0 : stake)),
    returns: returns.map((ret) => (isNaN(ret) ? 0 : ret)),
    profit: isNaN(profit) ? 0 : profit,
    profitPercentage: isNaN(profitPercentage) ? 0 : Math.round(profitPercentage * 100) / 100,
  }
}

// FUNÇÃO: Distribuir stakes considerando casa fixada E stakes manuais
function distributeStakesWithFixedAndManual(bookmakers, fixedIndex, fixedStake) {
  const stakes = bookmakers.map(() => 0)
  stakes[fixedIndex] = fixedStake

  const fixedBookmaker = bookmakers[fixedIndex]
  const fixedOdd = safeParseFloat(fixedBookmaker.finalOdd)

  // Calculate the target TOTAL return when the fixed house wins
  let targetTotalReturn

  if (fixedBookmaker.isLayBet) {
    // If fixed is lay: when it wins, total return = stake + liability not paid - commission
    const commissionRate = safeParseFloat(fixedBookmaker.commissionRate) / 100
    const liability = fixedStake * (fixedOdd - 1)
    targetTotalReturn = fixedStake * (1 - commissionRate) + liability
  } else if (fixedBookmaker.freebet) {
    // If fixed is freebet: when it wins, total return = stake × (odd - 1)
    targetTotalReturn = fixedStake * (fixedOdd - 1)
  } else {
    // If fixed is normal back: when it wins, total return = stake × odd
    targetTotalReturn = fixedStake * fixedOdd
  }

  // Now calculate stakes for each other bookmaker
  bookmakers.forEach((bm, index) => {
    if (index === fixedIndex) return // Skip the fixed one

    // VERIFICAR se tem stake manual primeiro
    if (bm.manualStake !== null && bm.manualStake !== undefined) {
      stakes[index] = safeParseFloat(bm.manualStake)
      return
    }

    // Se não tem stake manual, calcular baseado no retorno da casa fixada
    const finalOdd = safeParseFloat(bm.finalOdd)

    if (bm.isLayBet) {
      // For lay: when it wins, total return = stake × (1 - commission) + liability
      const commissionRate = safeParseFloat(bm.commissionRate) / 100
      const effectiveFactor = finalOdd - commissionRate
      stakes[index] = effectiveFactor > 0 ? targetTotalReturn / effectiveFactor : 0
    } else if (bm.freebet) {
      // For freebet: when it wins, total return = stake × (odd - 1) = targetTotalReturn
      stakes[index] = finalOdd > 1 ? targetTotalReturn / (finalOdd - 1) : 0
    } else {
      // For normal back: when it wins, total return = stake × odd = targetTotalReturn
      stakes[index] = targetTotalReturn / finalOdd
    }
  })

  return stakes.map((stake) => Math.round((stake || 0) * 100) / 100)
}

// New function to calculate stakes when no stake is fixed - CORRECTED
function calculateStakesWithNewLayLogic(bookmakers, targetInvestment) {
  // For multiple bookmakers, we need to solve a system where all returns are equal
  // and the total investment equals the target

  // First, calculate the effective probabilities considering lay bets and commissions
  const effectiveProbabilities = bookmakers.map((bm) => {
    const finalOdd = safeParseFloat(bm.finalOdd)

    if (bm.isLayBet) {
      // For lay bets, convert to back equivalent and account for commission
      const backEquivalent = finalOdd / (finalOdd - 1)
      const commissionRate = safeParseFloat(bm.commissionRate) / 100
      const effectiveReturn = 1 - commissionRate
      return 1 / (backEquivalent * effectiveReturn)
    } else if (bm.freebet) {
      // For freebets, the effective odd is (odd - 1)
      return finalOdd > 1 ? 1 / (finalOdd - 1) : 1
    } else {
      // For normal back bets
      return 1 / finalOdd
    }
  })

  const totalProb = effectiveProbabilities.reduce((sum, prob) => sum + prob, 0)

  // Calculate initial stakes based on probabilities
  const initialStakes = effectiveProbabilities.map((prob) => {
    return (targetInvestment * prob) / totalProb
  })

  // Now we need to adjust these stakes so that the actual investment equals targetInvestment
  // Calculate what the actual investment would be with these stakes
  let actualInvestment = 0
  initialStakes.forEach((stake, index) => {
    const bm = bookmakers[index]
    if (bm.isLayBet) {
      // For lay bets, investment is the liability
      const layOdd = safeParseFloat(bm.finalOdd)
      actualInvestment += stake * (layOdd - 1)
    } else {
      // For back bets, investment is the stake
      actualInvestment += stake
    }
  })

  // Scale the stakes to match the target investment
  const scaleFactor = targetInvestment / actualInvestment
  const adjustedStakes = initialStakes.map((stake) => stake * scaleFactor)

  return adjustedStakes.map((stake) => Math.round((stake || 0) * 100) / 100)
}

// Helper function for safe parsing
function safeParseFloat(value) {
  if (value === "" || value === null || value === undefined) {
    return 0
  }
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

// Function to distribute stakes based on a fixed stake, considering freebets and lay bets
function distributeStakesWithLayAndFreebets(bookmakers, convertedOdds, fixedIndex, fixedStake) {
  // Safety checks
  if (
    !convertedOdds ||
    convertedOdds.length === 0 ||
    fixedIndex < 0 ||
    fixedIndex >= convertedOdds.length ||
    fixedStake <= 0
  ) {
    return convertedOdds.map(() => 0)
  }

  // Ensure all odds are valid
  if (convertedOdds.some((odd) => odd <= 0 || isNaN(odd))) {
    return convertedOdds.map(() => 0)
  }

  // Calculate the effective return for the fixed stake
  const fixedBookmaker = bookmakers[fixedIndex]
  const fixedOdd = convertedOdds[fixedIndex] // This is already converted if lay
  let fixedReturn

  if (fixedBookmaker.isLayBet) {
    // For lay bets, consider commission
    const commissionRate = safeParseFloat(fixedBookmaker.commissionRate) / 100
    fixedReturn = fixedStake * (1 - commissionRate)
  } else if (fixedBookmaker.freebet) {
    // For freebets, return is only the profit
    fixedReturn = fixedStake * (fixedOdd - 1)
  } else {
    // For normal bets, return includes the stake back
    fixedReturn = fixedStake * fixedOdd
  }

  // Calculate stakes for all other outcomes to match the fixed return
  return bookmakers.map((bm, index) => {
    if (index === fixedIndex) {
      return fixedStake
    } else {
      const odd = convertedOdds[index] // Already converted if lay
      let requiredStake

      if (bm.isLayBet) {
        // For lay bets, account for commission
        const commissionRate = safeParseFloat(bm.commissionRate) / 100
        requiredStake = fixedReturn / (1 - commissionRate)
      } else if (bm.freebet) {
        // For freebets, we need: stake * (odd - 1) = fixedReturn
        requiredStake = odd > 1 ? fixedReturn / (odd - 1) : 0
      } else {
        // For normal bets, we need: stake * odd = fixedReturn
        requiredStake = fixedReturn / odd
      }

      // Arredondar para 2 casas decimais para evitar dízimas periódicas
      return isNaN(requiredStake) ? 0 : Math.round(requiredStake * 100) / 100
    }
  })
}

// Function to distribute stakes based on a fixed stake (legacy function for backward compatibility)
export function distributeStakes(odds, fixedIndex, fixedStake) {
  // Safety checks
  if (!odds || odds.length === 0 || fixedIndex < 0 || fixedIndex >= odds.length || fixedStake <= 0) {
    return odds.map(() => 0)
  }

  // Ensure all odds are valid
  if (odds.some((odd) => odd <= 0 || isNaN(odd))) {
    return odds.map(() => 0)
  }

  // Calculate the implied probability for the fixed stake
  const impliedProbability = 1 / odds[fixedIndex]

  // Calculate the ratio of the fixed stake to its implied probability
  const ratio = fixedStake / impliedProbability

  // Calculate stakes for all outcomes based on this ratio
  return odds.map((odd, index) => {
    if (index === fixedIndex) {
      return fixedStake
    } else {
      const stake = (1 / odd) * ratio
      // Arredondar para 2 casas decimais para evitar dízimas periódicas
      return isNaN(stake) ? 0 : Math.round(stake * 100) / 100
    }
  })
}
