/*
 * (C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *      Nelson Silva <nsilva@nuxeo.com>
 */

package org.nuxeo.ecm.platform.webcomponents.layout.converters;

import com.google.common.base.CaseFormat;

/**
 * Utility methods for tag generation.
 *
 * @since 7.3
 */
public class TagUtils {

    public static final String TAG_PREFIX = "nx";

    public static String getTag(String name) {
        // handle studio generated ids differently to make them look nicer
        if (name.contains("@")) {
            String[] parts = name.split("@");
            name = parts[1] + "-" + parts[0];
        }
        // remove all but valid charaters
        name = name.replaceAll("[^a-zA-Z0-9-]", "-");
        // camel case to lower hyphen
        name = CaseFormat.UPPER_CAMEL.to(CaseFormat.LOWER_HYPHEN, name);
        // remove any '--' that the previous step might have added
        name = name.replaceAll("--", "-");
        return TAG_PREFIX + "-" + name;
    }
}
