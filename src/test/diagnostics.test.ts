/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

describe('Should get diagnostics', () => {
  const docUri = getDocUri('diagnostics.sql')
  console.log(docUri);


  it('Diagnoses uppercase texts', async () => {
    await testDiagnostics(docUri, [
      { message: "extraneous input ';' expecting", range: toRange(0, 18, 0, 19), severity: vscode.DiagnosticSeverity.Error, source: 'ex' },
      { message: "mismatched input '<EOF>' expecting {'ELSE', 'ELSIF', 'END'}", range: toRange(7, 1, 7, 2), severity: vscode.DiagnosticSeverity.Error, source: 'ex' },
      { message: "mismatched input '<EOF>' expecting {'END', 'EXCEPTION'}", range: toRange(7, 1, 7, 2), severity: vscode.DiagnosticSeverity.Error, source: 'ex' }
    ])
  })
})

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new vscode.Position(sLine, sChar)
  const end = new vscode.Position(eLine, eChar)
  return new vscode.Range(start, end)
}

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
  await activate(docUri)

  const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

  assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i]
    assert.equal(actualDiagnostic.message, expectedDiagnostic.message)
    assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range)
    assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity)
  })
}