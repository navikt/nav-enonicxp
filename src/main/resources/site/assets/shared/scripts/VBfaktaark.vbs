Function findString(txtSok,lstObj)
	On Error Resume Next
	Set RegularExpressionObject = New RegExp
	With RegularExpressionObject
	.Pattern = txtSok '& "\b"
	.IgnoreCase = True
	.Global = True
	End With
	If Len(txtSok) >= 0 Then
	     Dim i
	     For i=0 To lstObj.length-1
	       If RegularExpressionObject.Test(lstObj(i).text) Then
		lstObj.selectedIndex = i
		setLink lstObj(i).value
	                    Exit For
                             End If
	      Next
	End If
	On Error GoTo 0
End Function