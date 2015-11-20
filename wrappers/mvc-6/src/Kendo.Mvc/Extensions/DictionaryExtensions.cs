﻿using Microsoft.AspNet.Routing;
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.WebEncoders;

namespace Kendo.Mvc.Extensions
{
    public static class DictionaryExtensions
    {
        /// <summary>
        /// Merges the specified instance.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="key">The key.</param>
        /// <param name="value">The value.</param>
        /// <param name="replaceExisting">if set to <c>true</c> [replace existing].</param>
        public static void Merge(this IDictionary<string, object> instance, string key, object value, bool replaceExisting)
        {

            if (replaceExisting || !instance.ContainsKey(key))
            {
                instance[key] = value;
            }
        }

        /// <summary>
        /// Appends the in value.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="key">The key.</param>
        /// <param name="separator">The separator.</param>
        /// <param name="value">The value.</param>
        public static void AppendInValue(this IDictionary<string, object> instance, string key, string separator, object value)
        {
            instance[key] = instance.ContainsKey(key) ? instance[key] + separator + value : value.ToString();
        }

        /// <summary>
        /// Appends the specified value at the beginning of the existing value
        /// </summary>
        /// <param name="instance"></param>
        /// <param name="key"></param>
        /// <param name="separator"></param>
        /// <param name="value"></param>
        public static void PrependInValue(this IDictionary<string, object> instance, string key, string separator, object value)
        {
            instance[key] = instance.ContainsKey(key) ? value + separator + instance[key] : value.ToString();
        }

        /// <summary>
        /// Merges the specified instance.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="from">From.</param>
        /// <param name="replaceExisting">if set to <c>true</c> [replace existing].</param>
        public static void Merge(this IDictionary<string, object> instance, IDictionary<string, object> from, bool replaceExisting)
        {

            foreach (KeyValuePair<string, object> pair in from)
            {
                if (!replaceExisting && instance.ContainsKey(pair.Key))
                {
                    continue; // Try the next
                }

                instance[pair.Key] = pair.Value;
            }
        }

        /// <summary>
        /// Merges the specified instance.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="from">From.</param>
        public static void Merge(this IDictionary<string, object> instance, IDictionary<string, object> from)
        {
            Merge(instance, from, true);
        }

        /// <summary>
        /// Merges the specified instance.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="values">The values.</param>
        /// <param name="replaceExisting">if set to <c>true</c> [replace existing].</param>
        public static void Merge(this IDictionary<string, object> instance, object values, bool replaceExisting)
        {
            Merge(instance, new RouteValueDictionary(values), replaceExisting);
        }

        /// <summary>
        /// Merges the specified instance.
        /// </summary>
        /// <param name="instance">The instance.</param>
        /// <param name="values">The values.</param>
        public static void Merge(this IDictionary<string, object> instance, object values)
        {
            Merge(instance, values, true);
        }

		public static IDictionary<string, object> Add<T>(this IDictionary<string, object> instance, string key, T value, T defaultValue)
			where T : IComparable
		{
			if (value != null && value.CompareTo(defaultValue) != 0)
			{
				instance[key] = value;
			}
			return instance;
		}

		public static IDictionary<string, object> Add<T>(this IDictionary<string, object> instance, string key, T value, Func<bool> condition)
		{
			if (condition())
			{
				instance[key] = value;
			}
			return instance;
		}        

		/// <summary>
		/// Toes the attribute string.
		/// </summary>
		/// <param name="instance">The instance.</param>
		/// <returns></returns>
		public static string ToAttributeString(this IDictionary<string, object> instance)
		{
			var attributes = new StringBuilder();

            var encoder = HtmlEncoder.Default;

            foreach (KeyValuePair<string, object> attribute in instance)
			{
				attributes.Append(" {0}=\"{1}\"".FormatWith(encoder.HtmlEncode(attribute.Key), encoder.HtmlEncode(attribute.Value.ToString())));
			}

			return attributes.ToString();
		}
	}
}