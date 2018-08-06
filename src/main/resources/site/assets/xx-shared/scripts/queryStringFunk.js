function createQueryString(business, county, queryString)
{	
	var ret = "";
	
	if(county){			
		ret += "contentdata/county='";
		ret += county;
		ret += "'";			
	}	
	if(business){
		if(county){
			ret += " AND ";
		}
		ret += "contentdata/business='";
		ret += business;
		ret += "'";	
	}	
	queryString.value = ret;
}