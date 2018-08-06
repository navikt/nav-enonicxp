<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet exclude-result-prefixes="saxon xs portal" version="2.0" xmlns:portal="http://www.enonic.com/cms/xslt/portal" xmlns:saxon="http://icl.com/saxon" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output indent="yes" method="xml" saxon:indent-spaces="4"/>
	<xsl:param name="numberOfTables" select="count(/result/contents/content/contentdata/article/text/div/table)"/>
	<xsl:variable name="contextRoot" select="/result/contents/content"/>
	<xsl:template match="/">
		<xsl:if test="/result/contents/content">
			<xsl:call-template name="tableCount"/>
			<input type="hidden" name="innholdstype" value="Tabell"/>
			<input type="hidden" name="tabelltype" value="{/result/contents/content/categoryname}"/>			
			<input name="emneord" type="hidden">
				<xsl:attribute name="value"><xsl:for-each select="/result/contents/relatedcontents/content[@contenttypekey='1017']"><xsl:if test="position()!=1"><xsl:text> ; </xsl:text></xsl:if><xsl:value-of select="title"/></xsl:for-each></xsl:attribute>
			</input>
			<input name="endretDato" type="hidden" value="{/result/contents/content/@timestamp}"/>
		</xsl:if>
	</xsl:template>
	<xsl:template name="content">
		<xsl:param name="tableNumber" select="1"/>
		<xsl:if test="normalize-space($contextRoot/contentdata/article/text/div/h1[$tableNumber])">
			<h4>
				<xsl:value-of disable-output-escaping="yes" select="$contextRoot/contentdata/article/text/div/h1[$tableNumber]"/>
			</h4>
		</xsl:if>
		<xsl:if test="$contextRoot/contentdata/article/text/div/table[$tableNumber]">
			<table class="NAVnumTbl">
				<xsl:if test="$contextRoot/contentdata/article/text/div/table/thead">
					<thead>
						<xsl:apply-templates select="$contextRoot/contentdata/article/text/div/table[$tableNumber]/thead/tr"/>
					</thead>
				</xsl:if>
				<xsl:if test="$contextRoot/contentdata/article/text/div/table/tbody">
					<tbody>
						<xsl:apply-templates select="$contextRoot/contentdata/article/text/div/table[$tableNumber]/tbody/tr"/>
					</tbody>
				</xsl:if>
			</table>
		</xsl:if>
		<xsl:variable name="nextSibling" select="$contextRoot/contentdata/article/text/div/table[$tableNumber]/following-sibling::*[1]"/>
		<xsl:if test="$nextSibling[name()='div']">
			<xsl:variable name="divClass" select="$contextRoot/contentdata/article/text/div/table[$tableNumber]/following-sibling::*[1]/@class"/>
			<xsl:choose>
				<xsl:when test="$divClass='statFoot'">
					<div class="NAVportletSpacer"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></div>
					<xsl:text disable-output-escaping="yes">&lt;ul&gt;</xsl:text>
					<xsl:call-template name="footNote">
						<xsl:with-param name="currentElm" select="$contextRoot/contentdata/article/text/div/table[$tableNumber]/following-sibling::*[1]"/>
					</xsl:call-template>
				</xsl:when>
				<xsl:when test="$divClass='statSideskift'">
					<div class="NAVpageBreak"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></div>
				</xsl:when>
			</xsl:choose>
		</xsl:if>
		<div class="NAVportletSpacer"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></div>
	</xsl:template>
	<xsl:template match="contentdata/article/text/div/table/thead/tr">
		<tr>
			<xsl:for-each select="th">
				<th scope="col">
					<xsl:copy-of select="@colspan | @rowspan"/>
					<div>
						<xsl:value-of select="node()"/>
					</div>
				</th>
			</xsl:for-each>
		</tr>
	</xsl:template>
	<xsl:template match="contentdata/article/text/div/table/tbody/tr">
		<xsl:choose>
			<xsl:when test="position() mod 2 = 1">
				<xsl:text disable-output-escaping="yes">&lt;tr class=&quot;NAValternateRow&quot;&gt;</xsl:text>
			</xsl:when>
			<xsl:when test="position() mod 2 = 0">
				<xsl:text disable-output-escaping="yes">&lt;tr&gt;</xsl:text>
			</xsl:when>
		</xsl:choose>
		<xsl:for-each select="td">
			<xsl:variable name="tdClass" select="@class"/>
			<xsl:choose>
				<xsl:when test="$tdClass='statHead' and position() &lt; 3">
					<td class="NAVtextColumn" scope="row">
						<xsl:copy-of select="@colspan | @rowspan"/>
						<xsl:value-of select="node()"/>
					</td>
				</xsl:when>
				<xsl:when test="$tdClass!='statGroupHead' and $tdClass!='statGroupRest' and position() &lt; 2">
					<td class="NAVtextColumn" scope="row">
						<xsl:copy-of select="@colspan | @rowspan"/>
						<xsl:value-of select="node()"/>
					</td>
				</xsl:when>
				<xsl:when test="$tdClass!='statGroupHead' and $tdClass!='statGroupRest'">
					<td>
						<xsl:copy-of select="@colspan | @rowspan"/>
						<xsl:value-of select="node()"/>
					</td>
				</xsl:when>
				<xsl:when test="$tdClass='statGroupHead'">
					<td class="NAVsemiHead NAVtextColumn" scope="row">
						<xsl:copy-of select="@colspan | @rowspan"/>
						<strong>
							<xsl:value-of select="node()"/>
						</strong>
					</td>
				</xsl:when>
				<xsl:when test="$tdClass='statGroupRest'">
					<td class="NAVsemiHead">
						<xsl:copy-of select="@colspan | @rowspan"/>
						<strong>
							<xsl:value-of select="node()"/>
						</strong>
					</td>
				</xsl:when>
				<xsl:when test="position() &lt; 2">
					<td class="NAVtextColumn" scope="row">
						<xsl:copy-of select="@colspan | @rowspan"/>
						<strong>
							<xsl:value-of select="node()"/>
						</strong>
					</td>
				</xsl:when>
				<xsl:otherwise>
					<td>
						<xsl:copy-of select="@colspan | @rowspan"/>
						<strong>
							<xsl:value-of select="node()"/>
						</strong>
					</td>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:for-each>
		<xsl:text disable-output-escaping="yes">&lt;/tr&gt;</xsl:text>
	</xsl:template>
	<xsl:template name="footNote">
		<xsl:param name="currentElm"/>
		<xsl:if test="$currentElm[name() = 'div']">
			<xsl:choose>
				<xsl:when test="$currentElm/@class='statFoot'">
					<li>
						<xsl:value-of select="$currentElm/node()"/>
					</li>
					<xsl:variable name="nextSibling" select="$currentElm/following-sibling::*[1]"/>
					<!--<xsl:value-of select="$nextSibling"/>-->
					<xsl:if test="$currentElm/following-sibling::*[1]/@class!='statFoot' or $nextSibling[name()!='div'] or not($nextSibling)">
						<xsl:text disable-output-escaping="yes">&lt;/ul&gt;</xsl:text>
					</xsl:if>
					<xsl:call-template name="footNote">
						<xsl:with-param name="currentElm" select="$currentElm/following-sibling::*[1]"/>
					</xsl:call-template>
				</xsl:when>
				<xsl:when test="$currentElm/@class='statSideskift'">
					<!--<xsl:text disable-output-escaping="yes">&lt;/ul&gt;</xsl:text>-->
					<div class="NAVpageBreak"><xsl:text disable-output-escaping="yes">&amp;nbsp;</xsl:text></div>
				</xsl:when>
			</xsl:choose>
		</xsl:if>
	</xsl:template>
	<xsl:template name="tableCount">
		<xsl:param name="count" select="1"/>
		<xsl:call-template name="content">
			<xsl:with-param name="tableNumber" select="$count"/>
		</xsl:call-template>
		<xsl:if test="$count &lt; $numberOfTables">
			<xsl:call-template name="tableCount">
				<xsl:with-param name="count" select="$count + 1"/>
			</xsl:call-template>
		</xsl:if>
	</xsl:template>
</xsl:stylesheet>
